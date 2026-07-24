import { Editor, Plugin } from "obsidian";
import { VikunjaClient } from "./api";
import { VikunjaSettingTab } from "./settings";
import {
	createFromSelectionOrLine,
	pushAllOpenTasks,
	setTaskDoneOnLine,
} from "./commands";

/** A cached (id, title) pair for the project dropdown. */
export interface CachedProject {
	id: number;
	title: string;
}

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
	/** Cache of projects for the settings dropdown; refreshed by Test connection. */
	cachedProjects: CachedProject[];
}

export const DEFAULT_SETTINGS: VikunjaNoteTasksSettings = {
	baseUrl: "",
	apiToken: "",
	defaultProjectId: null,
	defaultProjectName: "",
	defaultLabels: "",
	includeUndated: false,
	openInBrowserAfterCreate: false,
	cachedProjects: [],
};

export default class VikunjaNoteTasksPlugin extends Plugin {
	settings: VikunjaNoteTasksSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new VikunjaSettingTab(this.app, this));

		this.addCommand({
			id: "create-task-from-selection-or-line",
			name: "Create task from selection or line",
			editorCallback: (editor: Editor) =>
				createFromSelectionOrLine(this, editor),
		});

		this.addCommand({
			id: "push-all-open-tasks",
			name: "Push all open tasks in note to Vikunja",
			editorCallback: (editor: Editor) => pushAllOpenTasks(this, editor),
		});

		this.addCommand({
			id: "mark-task-done",
			name: "Mark Vikunja task done",
			editorCallback: (editor: Editor) =>
				setTaskDoneOnLine(this, editor, "done"),
		});

		this.addCommand({
			id: "toggle-task-done",
			name: "Toggle Vikunja task done/undone",
			editorCallback: (editor: Editor) =>
				setTaskDoneOnLine(this, editor, "toggle"),
		});
	}

	/** Builds a client from the current settings. Cheap; call per action. */
	getClient(): VikunjaClient {
		return new VikunjaClient({
			baseUrl: this.settings.baseUrl,
			token: this.settings.apiToken,
		});
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
