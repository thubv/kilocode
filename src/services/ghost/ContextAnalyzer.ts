import * as vscode from "vscode"
import { GhostSuggestionContext } from "./types"
import { ContextAnalysis, UseCaseType } from "./types/PromptStrategy"

/**
 * Analyzes GhostSuggestionContext to determine the appropriate use case and context properties
 */
export class ContextAnalyzer {
	/**
	 * Analyzes the given context to determine use case and properties
	 * @param context The suggestion context to analyze
	 * @returns Analysis result with use case and context properties
	 */
	analyze(context: GhostSuggestionContext): ContextAnalysis {
		const analysis: ContextAnalysis = {
			useCase: UseCaseType.AUTO_TRIGGER,
			hasUserInput: !!context.userInput,
			hasErrors: this.hasErrors(context),
			hasWarnings: this.hasWarnings(context),
			hasSelection: this.hasSelection(context),
			isInComment: this.isInComment(context),
			isNewLine: this.isNewLine(context),
			isInlineEdit: this.isInlineEdit(context),
			cursorLine: this.getCursorLine(context),
			cursorPosition: context.range?.start.character || 0,
		}

		// Determine primary use case based on priority
		analysis.useCase = this.determineUseCase(analysis)

		return analysis
	}

	/**
	 * Determines the primary use case based on context analysis
	 * Priority order is important here
	 */
	private determineUseCase(analysis: ContextAnalysis): UseCaseType {
		// Priority 1: User explicit request
		if (analysis.hasUserInput) {
			return UseCaseType.USER_REQUEST
		}

		// Priority 2: Error fixing
		if (analysis.hasErrors) {
			return UseCaseType.ERROR_FIX
		}

		// Priority 3: Selection refactoring
		if (analysis.hasSelection) {
			return UseCaseType.SELECTION_REFACTOR
		}

		// Priority 4: Comment-driven development
		if (analysis.isInComment) {
			return UseCaseType.COMMENT_DRIVEN
		}

		// Priority 5: New line completion
		if (analysis.isNewLine) {
			return UseCaseType.NEW_LINE
		}

		// Priority 6: Inline completion
		if (analysis.isInlineEdit) {
			return UseCaseType.INLINE_COMPLETION
		}

		// Priority 7: Default auto-trigger
		return UseCaseType.AUTO_TRIGGER
	}

	/**
	 * Checks if the context has compilation errors
	 */
	private hasErrors(context: GhostSuggestionContext): boolean {
		return context.diagnostics?.some((d) => d.severity === vscode.DiagnosticSeverity.Error) || false
	}

	/**
	 * Checks if the context has warnings
	 */
	private hasWarnings(context: GhostSuggestionContext): boolean {
		return context.diagnostics?.some((d) => d.severity === vscode.DiagnosticSeverity.Warning) || false
	}

	/**
	 * Checks if text is selected (non-empty range)
	 */
	private hasSelection(context: GhostSuggestionContext): boolean {
		return context.range ? !context.range.isEmpty : false
	}

	/**
	 * Checks if the cursor is within a comment
	 */
	private isInComment(context: GhostSuggestionContext): boolean {
		if (!context.document || !context.range) return false

		const line = context.document.lineAt(context.range.start.line).text
		const beforeCursor = line.substring(0, context.range.start.character)

		// Check for common comment patterns
		const commentPatterns = [
			/\/\//, // JavaScript/TypeScript single-line comment
			/\/\*/, // Multi-line comment start
			/#/, // Python/Shell comment
			/<!--/, // HTML comment
		]

		return commentPatterns.some((pattern) => pattern.test(beforeCursor))
	}

	/**
	 * Checks if the cursor is on a new/empty line
	 */
	private isNewLine(context: GhostSuggestionContext): boolean {
		if (!context.document || !context.range) return false

		const line = context.document.lineAt(context.range.start.line).text
		return line.trim() === ""
	}

	/**
	 * Checks if the cursor is in the middle of a line (inline editing)
	 */
	private isInlineEdit(context: GhostSuggestionContext): boolean {
		if (!context.document || !context.range) return false

		const line = context.document.lineAt(context.range.start.line).text
		const hasContent = line.trim() !== ""
		const notInComment = !this.isInComment(context)

		return hasContent && notInComment
	}

	/**
	 * Gets the text of the current line where the cursor is
	 */
	private getCursorLine(context: GhostSuggestionContext): string {
		if (!context.document || !context.range) return ""

		return context.document.lineAt(context.range.start.line).text
	}

	/**
	 * Checks if the cursor is at the end of a line
	 */
	isAtEndOfLine(context: GhostSuggestionContext): boolean {
		if (!context.document || !context.range) return false

		const line = context.document.lineAt(context.range.start.line).text
		return context.range.start.character >= line.length
	}

	/**
	 * Checks if the cursor is at the beginning of a line
	 */
	isAtBeginningOfLine(context: GhostSuggestionContext): boolean {
		if (!context.range) return false
		return context.range.start.character === 0
	}

	/**
	 * Gets the number of lines in the selection
	 */
	getSelectionLineCount(context: GhostSuggestionContext): number {
		if (!context.range || context.range.isEmpty) return 0
		return context.range.end.line - context.range.start.line + 1
	}

	/**
	 * Checks if the cursor is inside a function/method
	 */
	isInsideFunction(context: GhostSuggestionContext): boolean {
		return false
	}

	/**
	 * Checks if the cursor is inside a class
	 */
	isInsideClass(context: GhostSuggestionContext): boolean {
		return false
	}
}
