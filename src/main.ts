import { Editor, Plugin } from "obsidian";
import type { MarkdownFileInfo, MarkdownView } from "obsidian";
import { VikunjaClient } from "./api";
import { VikunjaSettingTab } from "./settings";
import {
	createFromSelectionOrLine,
	createInPickedProject,
	insertTodayTasks,
	openTaskInBrowser,
	pushAllOpenTasks,
	refreshStatuses,
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
	/**
	 * Folder-to-project rules, one `pattern = projectId` per line. Parsed by
	 * `parseFolderMappings`; consulted only when a note has no `vikunja-project`
	 * frontmatter key.
	 */
	folderMappings: string;
	defaultLabels: string;
	includeUndated: boolean;
	openInBrowserAfterCreate: boolean;
	/**
	 * Read a Tasks-plugin `📅 YYYY-MM-DD` due date off a captured line, and keep
	 * emoji date fields out of the task title.
	 */
	parseEmojiDates: boolean;
	/** Cache of projects for the settings dropdown; refreshed by Test connection. */
	cachedProjects: CachedProject[];
}

export const DEFAULT_SETTINGS: VikunjaNoteTasksSettings = {
	baseUrl: "",
	apiToken: "",
	defaultProjectId: null,
	defaultProjectName: "",
	folderMappings: "",
	defaultLabels: "",
	includeUndated: false,
	openInBrowserAfterCreate: false,
	parseEmojiDates: true,
	cachedProjects: [],
};

export default class VikunjaNoteTasksPlugin extends Plugin {
	settings: VikunjaNoteTasksSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new VikunjaSettingTab(this.app, this));

		// The two creating commands take the note's file as well as the editor:
		// routing reads that note's frontmatter and folder path.
		this.addCommand({
			id: "create-task-from-selection-or-line",
			name: "Create task from selection or line",
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) =>
				createFromSelectionOrLine(this, editor, ctx.file),
		});

		this.addCommand({
			id: "create-task-in-picked-project",
			name: "Create task in project…",
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) =>
				createInPickedProject(this, editor, ctx.file),
		});

		this.addCommand({
			id: "push-all-open-tasks",
			name: "Push all open tasks in note to Vikunja",
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) =>
				pushAllOpenTasks(this, editor, ctx.file),
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

		this.addCommand({
			id: "refresh-task-statuses",
			name: "Refresh Vikunja task statuses in note",
			editorCallback: (editor: Editor) => refreshStatuses(this, editor),
		});

		this.addCommand({
			id: "insert-today-tasks",
			name: "Insert today's Vikunja tasks",
			editorCallback: (editor: Editor) => insertTodayTasks(this, editor),
		});

		this.addCommand({
			id: "open-task-in-browser",
			name: "Open Vikunja task in browser",
			editorCallback: (editor: Editor) => openTaskInBrowser(this, editor),
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
