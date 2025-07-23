import { z } from "zod"

import { type ModelInfo } from "../model.js"

export type GeminiFjModelId = keyof typeof geminiFjModels

export const geminiFjDefaultModelId: GeminiFjModelId = "gemini-2.0-flash-thinking-exp-01-21"

export const geminiFjModels = {
	"gemini-2.0-flash-thinking-exp-01-21": {
		maxTokens: 65_536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-2.0-flash-exp": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
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
	"gemini-1.5-flash-002": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.15,
		outputPrice: 0.6,
		cacheReadsPrice: 0.0375,
		cacheWritesPrice: 1.0,
		tiers: [
			{
				contextWindow: 128_000,
				inputPrice: 0.075,
				outputPrice: 0.3,
				cacheReadsPrice: 0.01875,
			},
			{
				contextWindow: Infinity,
				inputPrice: 0.15,
				outputPrice: 0.6,
				cacheReadsPrice: 0.0375,
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
