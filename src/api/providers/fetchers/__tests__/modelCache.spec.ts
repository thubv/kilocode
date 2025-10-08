// Mocks must come first, before imports

// Mock NodeCache to avoid cache interference
vi.mock("node-cache", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			get: vi.fn().mockReturnValue(undefined), // Always return cache miss
			set: vi.fn(),
			del: vi.fn(),
		})),
	}
})

// Mock fs/promises to avoid file system operations
vi.mock("fs/promises", () => ({
	writeFile: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue("{}"),
	mkdir: vi.fn().mockResolvedValue(undefined),
}))

// Mock all the model fetchers
vi.mock("../litellm")
vi.mock("../openrouter")
vi.mock("../requesty")
vi.mock("../glama")
vi.mock("../unbound")
vi.mock("../io-intelligence")
vi.mock("../ovhcloud") // kilocode_change

// Then imports
import type { Mock } from "vitest"
import { getModels } from "../modelCache"
import { getLiteLLMModels } from "../litellm"
import { getOpenRouterModels } from "../openrouter"
import { getRequestyModels } from "../requesty"
import { getGlamaModels } from "../glama"
import { getUnboundModels } from "../unbound"
import { getIOIntelligenceModels } from "../io-intelligence"
import { getOvhCloudAiEndpointsModels } from "../ovhcloud" // kilocode_change

const mockGetLiteLLMModels = getLiteLLMModels as Mock<typeof getLiteLLMModels>
const mockGetOpenRouterModels = getOpenRouterModels as Mock<typeof getOpenRouterModels>
const mockGetRequestyModels = getRequestyModels as Mock<typeof getRequestyModels>
const mockGetGlamaModels = getGlamaModels as Mock<typeof getGlamaModels>
const mockGetUnboundModels = getUnboundModels as Mock<typeof getUnboundModels>
const mockGetIOIntelligenceModels = getIOIntelligenceModels as Mock<typeof getIOIntelligenceModels>
const mockGetOvhCloudAiEndpointsModels = getOvhCloudAiEndpointsModels as Mock<typeof getOvhCloudAiEndpointsModels> // kilocode_change

const DUMMY_REQUESTY_KEY = "requesty-key-for-testing"
const DUMMY_UNBOUND_KEY = "unbound-key-for-testing"
const DUMMY_IOINTELLIGENCE_KEY = "io-intelligence-key-for-testing"

describe("getModels with new GetModelsOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("calls getLiteLLMModels with correct parameters", async () => {
		const mockModels = {
			"claude-3-sonnet": {
				maxTokens: 4096,
				contextWindow: 200000,
				supportsPromptCache: false,
				description: "Claude 3 Sonnet via LiteLLM",
			},
		}
		mockGetLiteLLMModels.mockResolvedValue(mockModels)

		const result = await getModels({
			provider: "litellm",
			apiKey: "test-api-key",
			baseUrl: "http://localhost:4000",
		})

		expect(mockGetLiteLLMModels).toHaveBeenCalledWith("test-api-key", "http://localhost:4000")
		expect(result).toEqual(mockModels)
	})

	it("calls getOpenRouterModels for openrouter provider", async () => {
		const mockModels = {
			"openrouter/model": {
				maxTokens: 8192,
				contextWindow: 128000,
				supportsPromptCache: false,
				description: "OpenRouter model",
			},
		}
		mockGetOpenRouterModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "openrouter" })

		expect(mockGetOpenRouterModels).toHaveBeenCalled()
		expect(result).toEqual(mockModels)
	})

	it("calls getRequestyModels with optional API key", async () => {
		const mockModels = {
			"requesty/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Requesty model",
			},
		}
		mockGetRequestyModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "requesty", apiKey: DUMMY_REQUESTY_KEY })

		expect(mockGetRequestyModels).toHaveBeenCalledWith(undefined, DUMMY_REQUESTY_KEY)
		expect(result).toEqual(mockModels)
	})

	it("calls getGlamaModels for glama provider", async () => {
		const mockModels = {
			"glama/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Glama model",
			},
		}
		mockGetGlamaModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "glama" })

		expect(mockGetGlamaModels).toHaveBeenCalled()
		expect(result).toEqual(mockModels)
	})

	it("calls getUnboundModels with optional API key", async () => {
		const mockModels = {
			"unbound/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Unbound model",
			},
		}
		mockGetUnboundModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "unbound", apiKey: DUMMY_UNBOUND_KEY })

		expect(mockGetUnboundModels).toHaveBeenCalledWith(DUMMY_UNBOUND_KEY)
		expect(result).toEqual(mockModels)
	})

	it("calls IOIntelligenceModels for IO-Intelligence provider", async () => {
		const mockModels = {
			"io-intelligence/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "IO Intelligence Model",
			},
		}
		mockGetIOIntelligenceModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "io-intelligence", apiKey: DUMMY_IOINTELLIGENCE_KEY })

		expect(mockGetIOIntelligenceModels).toHaveBeenCalled()
		expect(result).toEqual(mockModels)
	})

	// kilocode_change start
	it("calls OvhCloudAiEndpointsModels for ovhcloud provider", async () => {
		const mockModels = {
			"ovhcloud/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "OVHCloud AI Endpoints Model",
			},
		}
		mockGetOvhCloudAiEndpointsModels.mockResolvedValue(mockModels)

		const result = await getModels({ provider: "ovhcloud" })

		expect(mockGetOvhCloudAiEndpointsModels).toHaveBeenCalled()
		expect(result).toEqual(mockModels)
	})
	// kilocode_change end

	it("handles errors and re-throws them", async () => {
		const expectedError = new Error("LiteLLM connection failed")
		mockGetLiteLLMModels.mockRejectedValue(expectedError)

		await expect(
			getModels({
				provider: "litellm",
				apiKey: "test-api-key",
				baseUrl: "http://localhost:4000",
			}),
		).rejects.toThrow("LiteLLM connection failed")
	})

	it("validates exhaustive provider checking with unknown provider", async () => {
		// This test ensures TypeScript catches unknown providers at compile time
		// In practice, the discriminated union should prevent this at compile time
		const unknownProvider = "unknown" as any

		await expect(
			getModels({
				provider: unknownProvider,
			}),
		).rejects.toThrow("Unknown provider: unknown")
	})
})
