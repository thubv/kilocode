import type { Anthropic } from "@anthropic-ai/sdk"
import {
	GoogleGenAI,
	type GenerateContentResponseUsageMetadata,
	type GenerateContentParameters,
	type GenerateContentConfig,
} from "@google/genai"
import type { JWTInput } from "google-auth-library"
import axios from "axios"

import { type ModelInfo, type GeminiFjModelId, geminiFjDefaultModelId, geminiFjModels } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"
import { safeJsonParse } from "../../shared/safeJsonParse"

import { convertAnthropicContentToGemini, convertAnthropicMessageToGemini } from "../transform/gemini-format"
import type { ApiStream } from "../transform/stream"
import { getModelParams } from "../transform/model-params"

import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { BaseProvider } from "./base-provider"

type GeminiFjHandlerOptions = ApiHandlerOptions & {
	isVertex?: boolean
	// Standard Gemini API options
	geminiApiKey?: string
	googleGeminiBaseUrl?: string
	// Vertex AI options
	vertexProjectId?: string
	vertexRegion?: string
	vertexJsonCredentials?: string
	vertexKeyFile?: string
	// Enhanced GeminiFj specific options
	geminiFjCustomEndpoint?: string
	geminiFjCustomApiKey?: string
	geminiFjMaxRetries?: number
	geminiFjRequestTimeout?: number
}

export class GeminiFjHandler extends BaseProvider implements SingleCompletionHandler {
	protected options: GeminiFjHandlerOptions

	private client: GoogleGenAI
	private maxRetries: number
	private requestTimeout: number

	constructor({ isVertex, ...options }: GeminiFjHandlerOptions) {
		super()

		this.options = options
		this.maxRetries = options.geminiFjMaxRetries ?? 3
		this.requestTimeout = options.geminiFjRequestTimeout ?? 30000

		const project = this.options.vertexProjectId ?? "not-provided"
		const location = this.options.vertexRegion ?? "not-provided"
		const apiKey = this.options.geminiApiKey ?? "not-provided"

		this.client = this.options.vertexJsonCredentials
			? new GoogleGenAI({
					vertexai: true,
					project,
					location,
					googleAuthOptions: {
						credentials: safeJsonParse<JWTInput>(this.options.vertexJsonCredentials, undefined),
					},
				})
			: this.options.vertexKeyFile
				? new GoogleGenAI({
						vertexai: true,
						project,
						location,
						googleAuthOptions: { keyFile: this.options.vertexKeyFile },
					})
				: isVertex
					? new GoogleGenAI({ vertexai: true, project, location })
					: new GoogleGenAI({ apiKey })
	}

	async *createMessage(
		systemInstruction: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		// Check if using custom endpoint
		if (this.options.geminiFjCustomEndpoint && this.options.geminiFjCustomApiKey) {
			yield* this.createMessageCustomEndpoint(systemInstruction, messages, metadata)
			return
		}

		// Use standard Gemini API
		yield* this.createMessageStandard(systemInstruction, messages, metadata)
	}

	/**
	 * Enhanced JSON parsing with auto-fix capability
	 */
	private safeJsonParseWithFix(jsonString: string): any | null {
		if (!jsonString || !jsonString.trim()) {
			return null
		}

		// Try normal parsing first
		try {
			return JSON.parse(jsonString)
		} catch (error) {
			console.warn("[GeminiFj] JSON parse failed, attempting fix:", error)

			// Attempt to fix incomplete JSON
			try {
				let fixed = jsonString.trim()

				// Count opening and closing brackets
				const openBraces = (fixed.match(/\{/g) || []).length
				const closeBraces = (fixed.match(/\}/g) || []).length
				const openBrackets = (fixed.match(/\[/g) || []).length
				const closeBrackets = (fixed.match(/\]/g) || []).length

				// Add missing closing braces
				if (openBraces > closeBraces) {
					fixed += "}".repeat(openBraces - closeBraces)
				}

				// Add missing closing brackets
				if (openBrackets > closeBrackets) {
					fixed += "]".repeat(openBrackets - closeBrackets)
				}

				// Remove trailing commas
				fixed = fixed.replace(/,(\s*[}\]])/g, "$1")

				const result = JSON.parse(fixed)
				console.log("[GeminiFj] Successfully fixed incomplete JSON")
				return result
			} catch (fixError) {
				console.error("[GeminiFj] Failed to fix JSON:", fixError)
				return null
			}
		}
	}

	/**
	 * Make HTTP request with retry mechanism for custom endpoints
	 */
	private async makeRequestWithRetry(url: string, data: any, headers: any): Promise<any> {
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				console.log(`[GeminiFj] Attempt ${attempt}/${this.maxRetries}`)

				const response = await axios.post(url, data, {
					headers,
					timeout: this.requestTimeout,
					validateStatus: (status) => status < 500, // Retry on 5xx errors
				})

				if (response.status !== 200) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`)
				}

				// Handle different response types
				if (typeof response.data === "string") {
					const parsed = this.safeJsonParseWithFix(response.data)
					if (parsed) {
						return parsed
					}
					throw new Error("Failed to parse response as JSON")
				}

				return response.data
			} catch (error: any) {
				lastError = error
				console.error(`[GeminiFj] Attempt ${attempt} failed:`, error.message)

				// Don't retry on 4xx errors (client errors)
				if (error.response?.status >= 400 && error.response?.status < 500) {
					throw error
				}

				// Wait before retry (exponential backoff)
				if (attempt < this.maxRetries) {
					const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
					console.log(`[GeminiFj] Waiting ${waitTime}ms before retry...`)
					await new Promise((resolve) => setTimeout(resolve, waitTime))
				}
			}
		}

		throw lastError || new Error("All retry attempts failed")
	}

	/**
	 * Handle custom endpoint requests (like company's Gemini API)
	 */
	private async *createMessageCustomEndpoint(
		systemInstruction: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const contents = messages.map(convertAnthropicMessageToGemini)

		const requestData = {
			contents: [
				{
					role: "user",
					parts: [{ text: systemInstruction }],
				},
				...contents,
			],
		}

		const headers = {
			"Content-Type": "application/json",
			"api-key": this.options.geminiFjCustomApiKey!,
		}

		try {
			const result = await this.makeRequestWithRetry(this.options.geminiFjCustomEndpoint!, requestData, headers)

			// Process response
			if (result.candidates && result.candidates[0]?.content?.parts) {
				for (const part of result.candidates[0].content.parts) {
					if (part.text) {
						yield { type: "text", text: part.text }
					}
				}
			}

			// Yield usage info if available
			if (result.usageMetadata) {
				const inputTokens = result.usageMetadata.promptTokenCount ?? 0
				const outputTokens = result.usageMetadata.candidatesTokenCount ?? 0

				yield {
					type: "usage",
					inputTokens,
					outputTokens,
					totalCost: 0, // Custom endpoint might be free
				}
			}
		} catch (error: any) {
			console.error("[GeminiFj] Custom endpoint error:", error)
			yield {
				type: "error",
				error: error.message,
				message: "Failed to get response from custom Gemini endpoint",
			}
		}
	}

	/**
	 * Handle standard Gemini API requests with enhanced error handling
	 */
	private async *createMessageStandard(
		systemInstruction: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const { id: model, info, reasoning: thinkingConfig, maxTokens } = this.getModel()

		const contents = messages.map(convertAnthropicMessageToGemini)

		const config: GenerateContentConfig = {
			systemInstruction,
			httpOptions: this.options.googleGeminiBaseUrl ? { baseUrl: this.options.googleGeminiBaseUrl } : undefined,
			thinkingConfig,
			maxOutputTokens: this.options.modelMaxTokens ?? maxTokens ?? undefined,
			temperature: this.options.modelTemperature ?? 0,
		}

		const params: GenerateContentParameters = { model, contents, config }

		try {
			const result = await this.client.models.generateContentStream(params)

			let lastUsageMetadata: GenerateContentResponseUsageMetadata | undefined
			let chunkCount = 0
			const maxChunks = 10000 // Prevent infinite loops

			for await (const chunk of result) {
				chunkCount++
				if (chunkCount > maxChunks) {
					console.error("[GeminiFj] Too many chunks, stopping stream")
					break
				}

				// Process candidates and their parts to separate thoughts from content
				if (chunk.candidates && chunk.candidates.length > 0) {
					const candidate = chunk.candidates[0]
					if (candidate.content && candidate.content.parts) {
						for (const part of candidate.content.parts) {
							if (part.thought) {
								// This is a thinking/reasoning part
								if (part.text) {
									yield { type: "reasoning", text: part.text }
								}
							} else {
								// This is regular content
								if (part.text) {
									yield { type: "text", text: part.text }
								}
							}
						}
					}
				}

				// Fallback to the original text property if no candidates structure
				else if (chunk.text) {
					yield { type: "text", text: chunk.text }
				}

				if (chunk.usageMetadata) {
					lastUsageMetadata = chunk.usageMetadata
				}
			}

			if (lastUsageMetadata) {
				const inputTokens = lastUsageMetadata.promptTokenCount ?? 0
				const outputTokens = lastUsageMetadata.candidatesTokenCount ?? 0
				const cacheReadTokens = lastUsageMetadata.cachedContentTokenCount
				const reasoningTokens = lastUsageMetadata.thoughtsTokenCount

				yield {
					type: "usage",
					inputTokens,
					outputTokens,
					cacheReadTokens,
					reasoningTokens,
					totalCost: this.calculateCost({ info, inputTokens, outputTokens, cacheReadTokens }),
				}
			}
		} catch (error: any) {
			console.error("[GeminiFj] Standard API error:", error)
			yield {
				type: "error",
				error: error.message,
				message: "Failed to get response from standard Gemini API",
			}
		}
	}

	override getModel() {
		const modelId = this.options.apiModelId
		let id = modelId && modelId in geminiFjModels ? (modelId as GeminiFjModelId) : geminiFjDefaultModelId
		const info: ModelInfo = geminiFjModels[id]
		const params = getModelParams({ format: "gemini", modelId: id, model: info, settings: this.options })

		// The `:thinking` suffix indicates that the model is a "Hybrid"
		// reasoning model and that reasoning is required to be enabled.
		// The actual model ID honored by Gemini's API does not have this
		// suffix.
		return { id: id.endsWith(":thinking") ? id.replace(":thinking", "") : id, info, ...params }
	}

	async completePrompt(prompt: string): Promise<string> {
		// Check if using custom endpoint
		if (this.options.geminiFjCustomEndpoint && this.options.geminiFjCustomApiKey) {
			return this.completePromptCustomEndpoint(prompt)
		}

		// Use standard API
		return this.completePromptStandard(prompt)
	}

	private async completePromptCustomEndpoint(prompt: string): Promise<string> {
		const requestData = {
			contents: [
				{
					role: "user",
					parts: [{ text: prompt }],
				},
			],
		}

		const headers = {
			"Content-Type": "application/json",
			"api-key": this.options.geminiFjCustomApiKey!,
		}

		try {
			const result = await this.makeRequestWithRetry(this.options.geminiFjCustomEndpoint!, requestData, headers)

			if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
				return result.candidates[0].content.parts[0].text
			}

			return ""
		} catch (error: any) {
			throw new Error(`GeminiFj custom endpoint completion error: ${error.message}`)
		}
	}

	private async completePromptStandard(prompt: string): Promise<string> {
		try {
			const { id: model } = this.getModel()

			const result = await this.client.models.generateContent({
				model,
				contents: [{ role: "user", parts: [{ text: prompt }] }],
				config: {
					httpOptions: this.options.googleGeminiBaseUrl
						? { baseUrl: this.options.googleGeminiBaseUrl }
						: undefined,
					temperature: this.options.modelTemperature ?? 0,
				},
			})

			return result.text ?? ""
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`GeminiFj standard completion error: ${error.message}`)
			}

			throw error
		}
	}

	override async countTokens(content: Array<Anthropic.Messages.ContentBlockParam>): Promise<number> {
		try {
			const { id: model } = this.getModel()

			const response = await this.client.models.countTokens({
				model,
				contents: convertAnthropicContentToGemini(content),
			})

			if (response.totalTokens === undefined) {
				console.warn("Gemini token counting returned undefined, using fallback")
				return super.countTokens(content)
			}

			return response.totalTokens
		} catch (error) {
			console.warn("Gemini token counting failed, using fallback", error)
			return super.countTokens(content)
		}
	}

	public calculateCost({
		info,
		inputTokens,
		outputTokens,
		cacheReadTokens = 0,
	}: {
		info: ModelInfo
		inputTokens: number
		outputTokens: number
		cacheReadTokens?: number
	}) {
		if (!info.inputPrice || !info.outputPrice || !info.cacheReadsPrice) {
			return undefined
		}

		let inputPrice = info.inputPrice
		let outputPrice = info.outputPrice
		let cacheReadsPrice = info.cacheReadsPrice

		// If there's tiered pricing then adjust the input and output token prices
		// based on the input tokens used.
		if (info.tiers) {
			const tier = info.tiers.find((tier) => inputTokens <= tier.contextWindow)

			if (tier) {
				inputPrice = tier.inputPrice ?? inputPrice
				outputPrice = tier.outputPrice ?? outputPrice
				cacheReadsPrice = tier.cacheReadsPrice ?? cacheReadsPrice
			}
		}

		// Subtract the cached input tokens from the total input tokens.
		const uncachedInputTokens = inputTokens - cacheReadTokens

		let cacheReadCost = cacheReadTokens > 0 ? cacheReadsPrice * (cacheReadTokens / 1_000_000) : 0

		const inputTokensCost = inputPrice * (uncachedInputTokens / 1_000_000)
		const outputTokensCost = outputPrice * (outputTokens / 1_000_000)
		const totalCost = inputTokensCost + outputTokensCost + cacheReadCost

		const trace: Record<string, { price: number; tokens: number; cost: number }> = {
			input: { price: inputPrice, tokens: uncachedInputTokens, cost: inputTokensCost },
			output: { price: outputPrice, tokens: outputTokens, cost: outputTokensCost },
		}

		if (cacheReadTokens > 0) {
			trace.cacheRead = { price: cacheReadsPrice, tokens: cacheReadTokens, cost: cacheReadCost }
		}

		// console.log(`[GeminiFjHandler] calculateCost -> ${totalCost}`, trace)

		return totalCost
	}
}
