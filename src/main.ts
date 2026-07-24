import { Plugin } from "obsidian";

/**
 * Persisted plugin settings. The API token is stored unencrypted in the
 * vault's plugin data (see the settings tab for the user-facing warning).
 */
export interface VikunjaNoteTasksSettings {
	baseUrl: string;
	apiToken: string;
	defaultProjectId: number | null;
	defaultProjectName: string;
	defaultLabels: string;
	includeUndated: boolean;
	openInBrowserAfterCreate: boolean;
}

export const DEFAULT_SETTINGS: VikunjaNoteTasksSettings = {
	baseUrl: "",
	apiToken: "",
	defaultProjectId: null,
	defaultProjectName: "",
	defaultLabels: "",
	includeUndated: false,
	openInBrowserAfterCreate: false,
};

export default class VikunjaNoteTasksPlugin extends Plugin {
	settings: VikunjaNoteTasksSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		// Commands and the settings tab are registered in later builds.
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
