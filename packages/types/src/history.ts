import { z } from "zod"

/**
 * HistoryItem
 */

export const historyItemSchema = z.object({
	id: z.string(),
	number: z.number(),
	ts: z.number(),
	task: z.string(),
	tokensIn: z.number(),
	tokensOut: z.number(),
	cacheWrites: z.number().optional(),
	cacheReads: z.number().optional(),
	totalCost: z.number(),
	size: z.number().optional(),
	workspace: z.string().optional(),
	isFavorited: z.boolean().optional(), // kilocode_change
	fileNotfound: z.boolean().optional(), // kilocode_change
	mode: z.string().optional(),
})

export type HistoryItem = z.infer<typeof historyItemSchema>
