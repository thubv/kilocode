import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"

export const GeminiFjTokenLimitDisplay = () => {
	// Vertex AI Gemini models typically have 1M token context window
	const tokenLimit = 1000000
	const formattedLimit = tokenLimit.toLocaleString()

	return (
		<VSCodeLink
			href="https://cloud.google.com/vertex-ai/generative-ai/docs/quotas"
			className="text-vscode-foreground hover:underline text-sm">
			{formattedLimit} tokens
		</VSCodeLink>
	)
}
