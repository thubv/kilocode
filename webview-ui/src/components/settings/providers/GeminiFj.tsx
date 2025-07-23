import { useCallback, useState } from "react"
import { Checkbox } from "vscrui"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"

import { inputEventTransform } from "../transforms"

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
	const [advancedOptionsSelected, setAdvancedOptionsSelected] = useState(
		!!(apiConfiguration?.geminiFjMaxRetries || apiConfiguration?.geminiFjRequestTimeout),
	)

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
			{/* Standard Gemini API Key */}
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

			{/* Standard Base URL */}
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

			{/* Advanced Options */}
			<div>
				<Checkbox
					checked={advancedOptionsSelected}
					onChange={(checked: boolean) => {
						setAdvancedOptionsSelected(checked)
						if (!checked) {
							setApiConfigurationField("geminiFjMaxRetries", undefined)
							setApiConfigurationField("geminiFjRequestTimeout", undefined)
						}
					}}>
					Advanced Options
				</Checkbox>
				{advancedOptionsSelected && (
					<>
						<VSCodeTextField
							value={apiConfiguration?.geminiFjMaxRetries?.toString() || ""}
							type="number"
							onInput={handleInputChange("geminiFjMaxRetries", (e: any) => {
								const value = parseInt(e.target.value)
								return isNaN(value) ? undefined : value
							})}
							placeholder="3"
							className="w-full mt-1">
							<label className="block font-medium mb-1">Max Retries</label>
						</VSCodeTextField>
						<VSCodeTextField
							value={apiConfiguration?.geminiFjRequestTimeout?.toString() || ""}
							type="number"
							onInput={handleInputChange("geminiFjRequestTimeout", (e: any) => {
								const value = parseInt(e.target.value)
								return isNaN(value) ? undefined : value
							})}
							placeholder="30000"
							className="w-full mt-1">
							<label className="block font-medium mb-1">Request Timeout (ms)</label>
						</VSCodeTextField>
						<div className="text-sm text-vscode-descriptionForeground mt-1">
							Configure retry behavior and timeout for enhanced error recovery.
						</div>
					</>
				)}
			</div>
		</>
	)
}
