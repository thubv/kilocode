import * as vscode from "vscode"
import type Anthropic from "@anthropic-ai/sdk"
import { execa } from "execa"
import { ClaudeCodeMessage } from "./types"
import readline from "readline"
import { CLAUDE_CODE_DEFAULT_MAX_OUTPUT_TOKENS } from "@roo-code/types"
import * as os from "os"
// kilocode_change start
import path from "node:path"
import crypto from "node:crypto"
import fs from "node:fs/promises"

export const MAX_SYSTEM_PROMPT_LENGTH = 65536
// kilocode_change end
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0)

type ClaudeCodeOptions = {
	systemPrompt: string
	systemPromptFile?: string // kilocode_change
	messages: Anthropic.Messages.MessageParam[]
	path?: string
	modelId?: string
}

type ProcessState = {
	partialData: string | null
	error: Error | null
	stderrLogs: string
	exitCode: number | null
}

// kilocode_change start
async function generateTempSystemPrompt(options: ClaudeCodeOptions): Promise<string | undefined> {
	const isWindows = os.platform() === "win32"
	const isSystemPromptTooLong = options.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH
	if (!isWindows && !isSystemPromptTooLong) {
		return undefined
	}
	const uniqueId = crypto.randomUUID()
	const tempFilePath = path.join(os.tmpdir(), `kilocode-system-prompt-${uniqueId}.txt`)
	await fs.writeFile(tempFilePath, options.systemPrompt, "utf8")
	return tempFilePath
}

async function unlinkTempSystemPrompt(systemPromptFile: string | undefined): Promise<void> {
	if (!systemPromptFile) {
		return
	}
	await fs.unlink(systemPromptFile).catch(console.log)
}
// kilocode_change end

export async function* runClaudeCode(
	options: ClaudeCodeOptions & { maxOutputTokens?: number },
): AsyncGenerator<ClaudeCodeMessage | string> {
	// kilocode_change start
	const systemPromptFile = await generateTempSystemPrompt(options)
	const process = runProcess({ ...options, systemPromptFile })
	// kilocode_change end

	const rl = readline.createInterface({
		input: process.stdout,
	})

	try {
		const processState: ProcessState = {
			error: null,
			stderrLogs: "",
			exitCode: null,
			partialData: null,
		}

		process.stderr.on("data", (data) => {
			processState.stderrLogs += data.toString()
		})

		process.on("close", (code) => {
			processState.exitCode = code
		})

		process.on("error", (err) => {
			processState.error = err
		})

		for await (const line of rl) {
			if (processState.error) {
				throw processState.error
			}

			if (line.trim()) {
				const chunk = parseChunk(line, processState)

				if (!chunk) {
					continue
				}

				yield chunk
			}
		}

		// We rely on the assistant message. If the output was truncated, it's better having a poorly formatted message
		// from which to extract something, than throwing an error/showing the model didn't return any messages.
		if (processState.partialData && processState.partialData.startsWith(`{"type":"assistant"`)) {
			yield processState.partialData
		}

		const { exitCode } = await process
		if (exitCode !== null && exitCode !== 0) {
			const errorOutput = processState.error?.message || processState.stderrLogs?.trim()
			throw new Error(
				`Claude Code process exited with code ${exitCode}.${errorOutput ? ` Error output: ${errorOutput}` : ""}`,
			)
		}
	} finally {
		rl.close()
		if (!process.killed) {
			process.kill()
		}
		// kilocode_change start
		if (systemPromptFile) {
			await unlinkTempSystemPrompt(systemPromptFile)
		}
		// kilocode_change end
	}
}

// We want the model to use our custom tool format instead of built-in tools.
// Disabling built-in tools prevents tool-only responses and ensures text output.
const claudeCodeTools = [
	"Task",
	"Bash",
	"Glob",
	"Grep",
	"LS",
	"exit_plan_mode",
	"Read",
	"Edit",
	"MultiEdit",
	"Write",
	"NotebookRead",
	"NotebookEdit",
	"WebFetch",
	"TodoRead",
	"TodoWrite",
	"WebSearch",
].join(",")

const CLAUDE_CODE_TIMEOUT = 600000 // 10 minutes

function runProcess({
	systemPrompt,
	systemPromptFile,
	messages,
	path,
	modelId,
	maxOutputTokens,
}: ClaudeCodeOptions & { maxOutputTokens?: number }) {
	const claudePath = path || "claude"
	// const isWindows = os.platform() === "win32" kilocode_change

	// Build args based on platform
	const args = ["-p"]

	// Pass system prompt as flag on non-Windows, via stdin on Windows (avoids cmd length limits)
	// kilocode_change start
	if (systemPromptFile) {
		args.push("--system-prompt-file", systemPromptFile)
	} else {
		args.push("--system-prompt", systemPrompt)
	}
	// kilocode_change end

	args.push(
		"--verbose",
		"--output-format",
		"stream-json",
		"--disallowedTools",
		claudeCodeTools,
		// Roo Code will handle recursive calls
		"--max-turns",
		"1",
	)

	if (modelId) {
		args.push("--model", modelId)
	}

	const child = execa(claudePath, args, {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			// Use the configured value, or the environment variable, or default to CLAUDE_CODE_DEFAULT_MAX_OUTPUT_TOKENS
			CLAUDE_CODE_MAX_OUTPUT_TOKENS:
				maxOutputTokens?.toString() ||
				process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS ||
				CLAUDE_CODE_DEFAULT_MAX_OUTPUT_TOKENS.toString(),
		},
		cwd,
		maxBuffer: 1024 * 1024 * 1000,
		timeout: CLAUDE_CODE_TIMEOUT,
	})

	const stdinData = JSON.stringify(messages) // kilocode_change

	// Use setImmediate to ensure process is spawned before writing (prevents stdin race conditions)
	setImmediate(() => {
		try {
			child.stdin.write(stdinData, "utf8", (error: Error | null | undefined) => {
				if (error) {
					console.error("Error writing to Claude Code stdin:", error)
					child.kill()
				}
			})
			child.stdin.end()
		} catch (error) {
			console.error("Error accessing Claude Code stdin:", error)
			child.kill()
		}
	})

	return child
}

function parseChunk(data: string, processState: ProcessState) {
	if (processState.partialData) {
		processState.partialData += data

		const chunk = attemptParseChunk(processState.partialData)

		if (!chunk) {
			return null
		}

		processState.partialData = null
		return chunk
	}

	const chunk = attemptParseChunk(data)

	if (!chunk) {
		processState.partialData = data
	}

	return chunk
}

function attemptParseChunk(data: string): ClaudeCodeMessage | null {
	try {
		return JSON.parse(data)
	} catch (error) {
		console.error("Error parsing chunk:", error, data.length)
		return null
	}
}
