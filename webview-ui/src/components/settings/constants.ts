import {
	type ProviderName,
	type ModelInfo,
	anthropicModels,
	bedrockModels,
	cerebrasModels,
	claudeCodeModels,
	deepSeekModels,
	moonshotModels,
	geminiModels,
	// kilocode_change start
	geminiCliModels,
	// kilocode_change end
	mistralModels,
	openAiNativeModels,
	qwenCodeModels,
	vertexModels,
	xaiModels,
	groqModels,
	// chutesModels, // kilocode_change
	sambaNovaModels,
	doubaoModels,
	internationalZAiModels,
	fireworksModels,
	syntheticModels, // kilocode_change
	rooModels,
	featherlessModels,
} from "@roo-code/types"

export const MODELS_BY_PROVIDER: Partial<Record<ProviderName, Record<string, ModelInfo>>> = {
	anthropic: anthropicModels,
	"claude-code": claudeCodeModels,
	bedrock: bedrockModels,
	cerebras: cerebrasModels,
	deepseek: deepSeekModels,
	doubao: doubaoModels,
	moonshot: moonshotModels,
	gemini: geminiModels,
	// kilocode_change start
	"gemini-cli": geminiCliModels,
	// kilocode_change end
	mistral: mistralModels,
	"openai-native": openAiNativeModels,
	"qwen-code": qwenCodeModels,
	vertex: vertexModels,
	xai: xaiModels,
	groq: groqModels,
	// chutes: chutesModels, // kilocode_change
	sambanova: sambaNovaModels,
	zai: internationalZAiModels,
	fireworks: fireworksModels,
	synthetic: syntheticModels, // kilocode_change
	roo: rooModels,
	featherless: featherlessModels,
}

export const PROVIDERS = [
	{ value: "openrouter", label: "OpenRouter" },
	{ value: "deepinfra", label: "DeepInfra" },
	{ value: "anthropic", label: "Anthropic" },
	{ value: "claude-code", label: "Claude Code" },
	{ value: "cerebras", label: "Cerebras" },
	{ value: "gemini", label: "Google Gemini" },
	{ value: "doubao", label: "Doubao" },
	// kilocode_change start
	{ value: "gemini-cli", label: "Gemini CLI" },
	{ value: "gemini-fj", label: "Gemini FJ (Enhanced)" },
	{ value: "virtual-quota-fallback", label: "Virtual Quota Fallback" },
	// kilocode_change end
	{ value: "deepseek", label: "DeepSeek" },
	{ value: "moonshot", label: "Moonshot" },
	{ value: "openai-native", label: "OpenAI" },
	{ value: "openai", label: "OpenAI Compatible" },
	{ value: "qwen-code", label: "Qwen Code" },
	{ value: "vertex", label: "GCP Vertex AI" },
	{ value: "bedrock", label: "Amazon Bedrock" },
	{ value: "glama", label: "Glama" },
	{ value: "vscode-lm", label: "VS Code LM API" },
	{ value: "mistral", label: "Mistral" },
	{ value: "lmstudio", label: "LM Studio" },
	{ value: "ollama", label: "Ollama" },
	{ value: "ovhcloud", label: "OVHcloud AI Endpoints" }, // kilocode_change
	{ value: "unbound", label: "Unbound" },
	{ value: "requesty", label: "Requesty" },
	{ value: "human-relay", label: "Human Relay" },
	{ value: "xai", label: "xAI (Grok)" },
	{ value: "groq", label: "Groq" },
	{ value: "huggingface", label: "Hugging Face" },
	{ value: "chutes", label: "Chutes AI" },
	{ value: "litellm", label: "LiteLLM" },
	{ value: "sambanova", label: "SambaNova" },
	{ value: "zai", label: "Z AI" },
	{ value: "fireworks", label: "Fireworks AI" },
	{ value: "synthetic", label: "Synthetic" }, // kilocode_change
	{ value: "featherless", label: "Featherless AI" },
	{ value: "io-intelligence", label: "IO Intelligence" },
	// kilocode_change start
	// { value: "roo", label: "Roo Code Cloud" },
	// kilocode_change end
	{ value: "vercel-ai-gateway", label: "Vercel AI Gateway" },
].sort((a, b) => a.label.localeCompare(b.label))

PROVIDERS.unshift({ value: "kilocode", label: "Kilo Code" }) // kilocode_change
