import { GhostSuggestionContext } from "../types"
import { UseCaseType } from "../types/PromptStrategy"
import { BasePromptStrategy } from "./BasePromptStrategy"
import { CURSOR_MARKER } from "../ghostConstants"

/**
 * Fallback strategy for automatic completions
 * handles all other cases with subtle suggestions
 */
export class AutoTriggerStrategy extends BasePromptStrategy {
	name = "Auto Trigger"
	type = UseCaseType.AUTO_TRIGGER

	/**
	 * Can handle any context (fallback strategy)
	 * Always returns true as this is the catch-all
	 */
	canHandle(context: GhostSuggestionContext): boolean {
		// This is the fallback strategy, so it can handle anything
		// But we check for basic requirements
		return !!context.document
	}

	/**
	 * Minimal context for auto-trigger
	 * Focus on immediate context only
	 */
	getRelevantContext(context: GhostSuggestionContext): Partial<GhostSuggestionContext> {
		return {
			document: context.document,
			range: context.range,
			recentOperations: context.recentOperations?.slice(0, 3), // Only last 3 operations
			// Exclude:
			// - userInput (no explicit request)
			// - diagnostics (not fixing errors)
			// - openFiles (reduces tokens)
		}
	}

	/**
	 * System instructions for auto-trigger
	 */
	protected getSpecificSystemInstructions(): string {
		return `Task: Subtle Auto-Completion
Provide non-intrusive completions after a typing pause. Be conservative and helpful.

`
	}

	/**
	 * Build minimal prompt for auto-trigger
	 */
	protected buildUserPrompt(context: Partial<GhostSuggestionContext>): string {
		let prompt = ""

		// Start with recent typing context
		if (context.recentOperations && context.recentOperations.length > 0) {
			prompt += "## Recent Typing\n"
			context.recentOperations.forEach((op, index) => {
				prompt += `${index + 1}. ${op.description}\n`
			})
			prompt += "\n"
		}

		// Add current position
		if (context.range && context.document) {
			const line = context.range.start.line + 1
			const char = context.range.start.character + 1
			prompt += `## Current Position\n`
			prompt += `Line ${line}, Character ${char}\n\n`
		}

		// Add the full document with cursor marker
		if (context.document) {
			prompt += "## Full Code\n"
			prompt += this.formatDocumentWithCursor(context.document, context.range)
			prompt += "\n\n"
		}

		// Add specific instructions
		prompt += "## Instructions\n"
		prompt += `Provide a minimal, obvious completion at the cursor position (${CURSOR_MARKER}).\n`
		prompt += `IMPORTANT: Your <search> block must include the cursor marker ${CURSOR_MARKER} to target the exact location.\n`
		prompt += `Include surrounding text with the cursor marker to avoid conflicts with similar code elsewhere.\n`
		prompt += "Complete only what the user appears to be typing.\n"
		prompt += "Single line preferred, no new features.\n"
		prompt += "If nothing obvious to complete, provide NO suggestion.\n"

		return prompt
	}
}
