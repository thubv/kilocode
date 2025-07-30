import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import * as vscode from "vscode"
import { GhostStrategy } from "../GhostStrategy"
import { GhostSuggestionContext, ASTContext } from "../types"
import { MockTextDocument } from "../../mocking/MockTextDocument"

// Create a mock Node class for testing
class MockNode {
	id: number = 1
	startIndex: number = 0
	endIndex: number = 0
	startPosition: { row: number; column: number } = { row: 0, column: 0 }
	endPosition: { row: number; column: number } = { row: 0, column: 0 }
	type: string = ""
	text: string = ""
	isNamed: boolean = true
	tree: any = {}
	parent: any = null
	childCount: number = 0
	namedChildCount: number = 0
	firstChild: any = null
	lastChild: any = null
	firstNamedChild: any = null
	lastNamedChild: any = null
	nextSibling: any = null
	previousSibling: any = null
	nextNamedSibling: any = null
	previousNamedSibling: any = null
	_childFunction: ((index: number) => any) | null = null
	descendantForPosition: ((startPosition: any, endPosition?: any) => any) | null = null

	constructor(props: Partial<MockNode> = {}) {
		Object.assign(this, props)
	}

	child(index: number): any {
		if (this._childFunction) {
			return this._childFunction(index)
		}
		return null
	}

	namedChild(index: number): any {
		return null
	}

	childForFieldName(fieldName: string): any {
		return null
	}

	childForFieldId(fieldId: number): any {
		return null
	}

	descendantForIndex(startIndex: number, endIndex?: number): any {
		return null
	}

	toString(): string {
		return this.text
	}

	walk(): any {
		return {}
	}

	namedDescendantForIndex(startIndex: number, endIndex?: number): any {
		return null
	}

	namedDescendantForPosition(startPosition: any, endPosition?: any): any {
		return null
	}

	descendantsOfType(type: string | string[], startPosition?: any, endPosition?: any): any[] {
		return []
	}
}

// Mock web-tree-sitter
vi.mock("web-tree-sitter", () => ({
	Node: vi.fn().mockImplementation(() => ({})),
}))

// Mock vscode
vi.mock("vscode", () => ({
	Uri: {
		parse: (uriString: string) => ({
			toString: () => uriString,
			fsPath: uriString.replace("file://", ""),
			scheme: "file",
			path: uriString.replace("file://", ""),
		}),
	},
	Position: class {
		constructor(
			public line: number,
			public character: number,
		) {}
	},
	Range: class {
		constructor(
			public start: any,
			public end: any,
		) {}
	},
	workspace: {
		asRelativePath: vi.fn().mockImplementation((uri) => {
			if (typeof uri === "string") {
				return uri.replace("file:///", "")
			}
			return uri.toString().replace("file:///", "")
		}),
		openTextDocument: vi.fn().mockImplementation((uri) => {
			// Return a mock document for any URI
			const mockDoc = new MockTextDocument(uri, "function test() {\n  return true;\n}")
			return Promise.resolve(mockDoc)
		}),
	},
}))

// Mock Fuse
vi.mock("fuse.js", () => {
	return {
		default: class Fuse {
			private items: any[] = []

			constructor(items: any[]) {
				this.items = items
			}

			search(query: string) {
				// Return the first item that matches the query
				// In our tests, we want to return the mockDocument.uri
				return this.items.map((item) => ({ item, score: 0 }))
			}
		},
	}
})

// Mock diff
vi.mock("diff", () => ({
	parsePatch: vi.fn().mockImplementation((diff) => {
		// Return a patch that includes the file name from the test
		return [
			{
				oldFileName: "file:///test.js",
				newFileName: "file:///test.js",
				hunks: [
					{
						oldStart: 1,
						oldLines: 3,
						newStart: 1,
						newLines: 4,
						lines: [" function test() {", "+  // Added comment", "   return true;", " }"],
					},
				],
			},
		]
	}),
	applyPatch: vi.fn().mockReturnValue("function test() {\n  // Added comment\n  return true;\n}"),
	structuredPatch: vi.fn().mockReturnValue({
		hunks: [
			{
				oldStart: 1,
				oldLines: 3,
				newStart: 1,
				newLines: 4,
				lines: [" function test() {", "+  // Added comment", "   return true;", " }"],
			},
		],
	}),
}))

describe("GhostStrategy", () => {
	let strategy: GhostStrategy
	let mockDocument: MockTextDocument
	let mockASTContext: ASTContext
	let mockRangeASTNode: MockNode

	beforeEach(() => {
		strategy = new GhostStrategy()
		mockDocument = new MockTextDocument(vscode.Uri.parse("file:///test.js"), "function test() {\n  return true;\n}")

		// Create child node
		const childNode = new MockNode({
			type: "return_statement",
			text: "return true;",
		})

		// Create parent node
		const parentNode = new MockNode({
			type: "function_declaration",
			text: "function test() { return true; }",
		})

		// Create previous sibling
		const prevSibling = new MockNode({
			type: "keyword",
			text: "function",
		})

		// Create next sibling
		const nextSibling = new MockNode({
			type: "parameters",
			text: "()",
		})

		// Create the main node with a proper child function
		mockRangeASTNode = new MockNode({
			type: "identifier",
			text: "test",
			parent: parentNode,
			previousSibling: prevSibling,
			nextSibling: nextSibling,
			childCount: 1,
			_childFunction: (index: number) => (index === 0 ? childNode : null),
		})

		// Create mock root node
		const mockRootNode = new MockNode({
			type: "program",
			text: "function test() { return true; }",
		})
		mockRootNode.descendantForPosition = vi.fn().mockReturnValue(mockRangeASTNode)

		// Create mock AST context
		mockASTContext = {
			rootNode: mockRootNode as any,
			language: "javascript",
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("getASTInfoPrompt", () => {
		it("should return empty string when no AST is provided", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toBe("")
		})

		it("should include language information when AST is provided", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("**AST Information:**")
			expect(astInfoPrompt).toContain("Language: javascript")
		})

		it("should include node information when astNodeAtCursor is provided", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("Current Node Type: identifier")
			expect(astInfoPrompt).toContain("Current Node Text: test")
		})

		it("should include parent node information when available", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("Parent Node Type: function_declaration")
		})

		it("should include sibling nodes when available", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("Surrounding Nodes:")
			expect(astInfoPrompt).toContain("keyword: function")
			expect(astInfoPrompt).toContain("parameters: ()")
		})

		it("should include child nodes when available", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("Child Nodes:")
			expect(astInfoPrompt).toContain("return_statement: return true;")
		})

		it("should truncate long node text", () => {
			const longText = "a".repeat(200)

			// Create node with long text
			const nodeWithLongText = new MockNode({
				type: "identifier",
				text: longText,
			})

			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: nodeWithLongText as any,
			}

			const astInfoPrompt = (strategy as any).getASTInfoPrompt(context)
			expect(astInfoPrompt).toContain("Current Node Text: " + longText.substring(0, 100) + "...")
		})
	})

	describe("getSuggestionPrompt", () => {
		it("should include AST information in the prompt when available", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const prompt = strategy.getSuggestionPrompt(context)
			expect(prompt).toContain("**AST Information:**")
			expect(prompt).toContain("Language: javascript")
			expect(prompt).toContain("Current Node Type: identifier")
		})

		it("should not include AST information when not available", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
			}

			const prompt = strategy.getSuggestionPrompt(context)
			expect(prompt).not.toContain("**AST Information:**")
		})

		it("should include AST information along with other context", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 13)),
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
				userInput: "Add a comment",
			}

			const prompt = strategy.getSuggestionPrompt(context)

			// Check for user input
			expect(prompt).toContain("**User Input:**")
			expect(prompt).toContain("Add a comment")

			// Check for user focus
			expect(prompt).toContain("**User Focus:**")
			expect(prompt).toContain("Cursor Position: Line 1, Character 10")

			// Check for AST info
			expect(prompt).toContain("**AST Information:**")
			expect(prompt).toContain("Language: javascript")

			// Check for current document
			expect(prompt).toContain("**Current Document:")
			expect(prompt).toContain("function test() {")
		})

		it("should include AST information in the correct order", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 13)),
				documentAST: mockASTContext,
				rangeASTNode: mockRangeASTNode as any,
			}

			const prompt = strategy.getSuggestionPrompt(context)

			// Get the positions of different sections
			const userFocusPos = prompt.indexOf("**User Focus:**")
			const astInfoPos = prompt.indexOf("**AST Information:**")
			const currentDocPos = prompt.indexOf("**Current Document:")

			// AST info should come after user focus but before current document
			expect(astInfoPos).toBeGreaterThan(userFocusPos)
			expect(currentDocPos).toBeGreaterThan(astInfoPos)
		})
	})

	describe("parseResponse", () => {
		it("should handle code block without file path", async () => {
			const responseWithoutFilePath = `\`\`\`javascript
function add(a, b) {
		  return a + b;
}
\`\`\``
			const context: GhostSuggestionContext = {
				document: mockDocument,
			}

			const result = await strategy.parseResponse(responseWithoutFilePath, context)
			expect(result.hasSuggestions()).toBe(true)
		})
	})
})
