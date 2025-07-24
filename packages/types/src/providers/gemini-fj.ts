import { z } from "zod"

import { type ModelInfo } from "../model.js"

export type GeminiFjModelId = keyof typeof geminiFjModels

export const geminiFjDefaultModelId: GeminiFjModelId = "gemini-2.5-flash"

export const geminiFjModels = {
	"gemini-2.5-flash": {
		maxTokens: 64_000,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 2.5,
		cacheReadsPrice: 0.075,
		cacheWritesPrice: 1.0,
		maxThinkingTokens: 24_576,
		supportsReasoningBudget: true,
	},
	"gemini-2.5-pro": {
		maxTokens: 64_000,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 2.5, // This is the pricing for prompts above 200k tokens.
		outputPrice: 15,
		cacheReadsPrice: 0.625,
		cacheWritesPrice: 4.5,
		maxThinkingTokens: 32_768,
		supportsReasoningBudget: true,
		requiredReasoningBudget: true,
		tiers: [
			{
				contextWindow: 200_000,
				inputPrice: 1.25,
				outputPrice: 10,
				cacheReadsPrice: 0.31,
			},
			{
				contextWindow: Infinity,
				inputPrice: 2.5,
				outputPrice: 15,
				cacheReadsPrice: 0.625,
			},
		],
	},
} as const satisfies Record<string, ModelInfo>

export const geminiFjModelIds = Object.keys(geminiFjModels) as GeminiFjModelId[]

export const geminiFjSchema = z.object({
	geminiFjApiKey: z.string().optional(),
	geminiFjCustomEndpoint: z.string().optional(),
	geminiFjCustomApiKey: z.string().optional(),
	geminiFjMaxRetries: z.number().optional(),
	geminiFjRequestTimeout: z.number().optional(),
	googleGeminiFjBaseUrl: z.string().optional(),
	vertexFjProjectId: z.string().optional(),
	vertexFjRegion: z.string().optional(),
	vertexFjJsonCredentials: z.string().optional(),
	vertexFjKeyFile: z.string().optional(),
})

export type GeminiFjSettings = z.infer<typeof geminiFjSchema>
