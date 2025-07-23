import { useCallback, useState } from "react"
import { Checkbox } from "vscrui"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"

import { inputEventTransform } from "../transforms"

type GeminiFjProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
}

export const GeminiFj = ({ apiConfiguration, setApiConfigurationField }: GeminiFjProps) => {
	const [customEndpointSelected, setCustomEndpointSelected] = useState(!!apiConfiguration?.geminiFjCustomEndpoint)
	const [advancedOptionsSelected, setAdvancedOptionsSelected] = useState(
		!!(
			apiConfiguration?.geminiFjMaxRetries ||
			apiConfiguration?.geminiFjRequestTimeout ||
			apiConfiguration?.geminiFjUseStreaming !== undefined
		),
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
							setApiConfigurationField("geminiFjUseStreaming", undefined)
						}
					}}>
					Advanced Options
				</Checkbox>
				{advancedOptionsSelected && (
					<>
						<VSCodeTextField
							value={apiConfiguration?.geminiFjMaxRetries?.toString() || ""}
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
							onInput={handleInputChange("geminiFjRequestTimeout", (e: any) => {
								const value = parseInt(e.target.value)
								return isNaN(value) ? undefined : value
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
								Enable Streaming Response Processing
							</Checkbox>
							<div className="text-sm text-vscode-descriptionForeground mt-1">
								Process responses as streaming chunks for better real-time output. Disable if your
								endpoint returns single response objects.
							</div>
						</div>
						<div className="text-sm text-vscode-descriptionForeground mt-2">
							Configure retry behavior, timeout, and response processing for enhanced error recovery.
						</div>
					</>
				)}
			</div>
		</>
	)
}
