import { useCallback, useState } from "react"
import { Checkbox } from "vscrui"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"
import { geminiFjDefaultModelId, geminiFjModels } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"

import { inputEventTransform } from "../transforms"
import { ModelPicker } from "../ModelPicker"

type GeminiFjProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
}

export const GeminiFj = ({ apiConfiguration, setApiConfigurationField }: GeminiFjProps) => {
	const { t } = useAppTranslation()

	const [googleGeminiBaseUrlSelected, setGoogleGeminiBaseUrlSelected] = useState(
		!!apiConfiguration?.googleGeminiBaseUrl,
	)
	const [customEndpointSelected, setCustomEndpointSelected] = useState(!!apiConfiguration?.geminiFjCustomEndpoint)
	// Advanced options are always visible now

	const handleInputChange = useCallback(
		<K extends keyof ProviderSettings, E>(
			field: K,
			transform: (event: E) => ProviderSettings[K] = inputEventTransform,
		) =>
			(event: E | Event) => {
				setApiConfigurationField(field, transform(event as E))
			},
		[setApiConfigurationField],
	)

	return (
		<>
			{/* Gemini API Configuration */}
			<VSCodeTextField
				value={apiConfiguration?.geminiApiKey || ""}
				type="password"
				onInput={handleInputChange("geminiApiKey")}
				placeholder={t("settings:placeholders.apiKey")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.geminiApiKey")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>
			{!apiConfiguration?.geminiApiKey && (
				<VSCodeButtonLink href="https://ai.google.dev/" appearance="secondary">
					{t("settings:providers.getGeminiApiKey")}
				</VSCodeButtonLink>
			)}
			<div>
				<Checkbox
					checked={googleGeminiBaseUrlSelected}
					onChange={(checked: boolean) => {
						setGoogleGeminiBaseUrlSelected(checked)
						if (!checked) {
							setApiConfigurationField("googleGeminiBaseUrl", "")
						}
					}}>
					{t("settings:providers.useCustomBaseUrl")}
				</Checkbox>
				{googleGeminiBaseUrlSelected && (
					<VSCodeTextField
						value={apiConfiguration?.googleGeminiBaseUrl || ""}
						type="url"
						onInput={handleInputChange("googleGeminiBaseUrl")}
						placeholder={t("settings:defaults.geminiUrl")}
						className="w-full mt-1"
					/>
				)}
			</div>

			{/* Custom Endpoint for Enhanced Features */}
			<div>
				<Checkbox
					checked={customEndpointSelected}
					onChange={(checked: boolean) => {
						setCustomEndpointSelected(checked)
						if (!checked) {
							setApiConfigurationField("geminiFjCustomEndpoint", "")
							setApiConfigurationField("geminiFjCustomApiKey", "")
						}
					}}>
					Use Custom Endpoint (Enhanced Features)
				</Checkbox>
				{customEndpointSelected && (
					<>
						<VSCodeTextField
							value={apiConfiguration?.geminiFjCustomEndpoint || ""}
							type="url"
							onInput={handleInputChange("geminiFjCustomEndpoint")}
							placeholder="https://your-company-gemini-api.com/v1/generate"
							className="w-full mt-1">
							<label className="block font-medium mb-1">Custom Endpoint URL</label>
						</VSCodeTextField>
						<VSCodeTextField
							value={apiConfiguration?.geminiFjCustomApiKey || ""}
							type="password"
							onInput={handleInputChange("geminiFjCustomApiKey")}
							placeholder="Custom API Key"
							className="w-full mt-1">
							<label className="block font-medium mb-1">Custom API Key</label>
						</VSCodeTextField>
						<div className="text-sm text-vscode-descriptionForeground mt-1">
							Use this for company-specific Gemini API endpoints with enhanced JSON error recovery.
						</div>
					</>
				)}
			</div>

			{/* Model Selection */}
			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={geminiFjDefaultModelId}
				models={geminiFjModels}
				modelIdKey="apiModelId"
				serviceName="Gemini FJ"
				serviceUrl="https://ai.google.dev/"
			/>

			{/* Advanced Options - Always Visible */}
			<div>
				<div className="font-medium mb-2">Advanced Options</div>
				<VSCodeTextField
					value={apiConfiguration?.geminiFjMaxRetries?.toString() || "3"}
					onInput={handleInputChange("geminiFjMaxRetries", (e: any) => {
						const value = parseInt(e.target.value)
						return isNaN(value) ? 3 : value
					})}
					placeholder="3"
					className="w-full mt-1">
					<label className="block font-medium mb-1">Max Retries</label>
				</VSCodeTextField>
				<VSCodeTextField
					value={apiConfiguration?.geminiFjRequestTimeout?.toString() || "30000"}
					onInput={handleInputChange("geminiFjRequestTimeout", (e: any) => {
						const value = parseInt(e.target.value)
						return isNaN(value) ? 30000 : value
					})}
					placeholder="30000"
					className="w-full mt-1">
					<label className="block font-medium mb-1">Request Timeout (ms)</label>
				</VSCodeTextField>
				<div className="mt-2">
					<Checkbox
						checked={apiConfiguration?.geminiFjUseStreaming ?? true}
						onChange={(checked: boolean) => {
							setApiConfigurationField("geminiFjUseStreaming", checked)
						}}>
						📡 Enable Streaming Response Processing
					</Checkbox>
					<div className="text-sm text-vscode-descriptionForeground mt-1">
						Process responses as streaming chunks for better real-time output. Disable if your endpoint
						returns single response objects.
					</div>
				</div>
				<div className="text-sm text-vscode-descriptionForeground mt-2">
					Configure retry behavior, timeout, and response processing for enhanced error recovery.
				</div>
			</div>
		</>
	)
}
