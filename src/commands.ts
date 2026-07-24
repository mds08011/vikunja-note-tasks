import { Editor, Notice } from "obsidian";
import type VikunjaNoteTasksPlugin from "./main";
import { VikunjaClient, VikunjaApiError, describeVikunjaError } from "./api";
import {
	extractTitle,
	hasMarker,
	isUncheckedTaskLine,
	rewriteLineWithTask,
} from "./markers";
import { taskWebUrl } from "./render";
import { parseCsvList, dedupeCaseInsensitive, summarize } from "./util";
import type { VikunjaTask } from "./types";

/** Replaces exactly one line, leaving every other character in the note intact. */
function replaceLine(editor: Editor, lineIndex: number, text: string): void {
	const from = { line: lineIndex, ch: 0 };
	const to = { line: lineIndex, ch: editor.getLine(lineIndex).length };
	editor.replaceRange(text, from, to);
}

/** Resolves label names to ids, creating any that don't exist yet. */
async function resolveLabelIds(
	client: VikunjaClient,
	names: string[],
): Promise<number[]> {
	if (names.length === 0) return [];
	const existing = await client.listLabels();
	const byLower = new Map(existing.map((l) => [l.title.toLowerCase(), l]));
	const ids: number[] = [];
	for (const name of names) {
		const found = byLower.get(name.toLowerCase());
		if (found) {
			ids.push(found.id);
		} else {
			const created = await client.createLabel(name);
			byLower.set(name.toLowerCase(), created);
			ids.push(created.id);
		}
	}
	return ids;
}

/** Resolves the configured default labels to ids once, creating any missing. */
async function ensureDefaultLabelIds(
	plugin: VikunjaNoteTasksPlugin,
	client: VikunjaClient,
): Promise<number[]> {
	const names = dedupeCaseInsensitive(
		parseCsvList(plugin.settings.defaultLabels),
	);
	return resolveLabelIds(client, names);
}

/** Creates one task in the default project and attaches the given labels. */
async function createOneTask(
	plugin: VikunjaNoteTasksPlugin,
	client: VikunjaClient,
	title: string,
	labelIds: number[],
): Promise<VikunjaTask> {
	const projectId = plugin.settings.defaultProjectId;
	if (projectId === null) {
		throw new VikunjaApiError(
			"config",
			"Choose a default project in the plugin settings first.",
		);
	}
	const task = await client.createTask(projectId, { title });
	for (const id of labelIds) {
		await client.addLabelToTask(task.id, id);
	}
	return task;
}

/**
 * "Create Vikunja task from selection or line": creates a task from the
 * selection (or the current line), then rewrites that line in place with a link
 * and marker. Refuses to act on a line that already has a marker.
 */
export async function createFromSelectionOrLine(
	plugin: VikunjaNoteTasksPlugin,
	editor: Editor,
): Promise<void> {
	try {
		const client = plugin.getClient();
		client.ensureConfigured();

		const lineIndex = editor.getCursor("from").line;
		const lineText = editor.getLine(lineIndex);

		if (hasMarker(lineText)) {
			new Notice("Vikunja: this line is already captured.");
			return;
		}

		const selection = editor.getSelection();
		const titleSource =
			selection && selection.trim().length > 0 ? selection : lineText;
		const title = extractTitle(titleSource);
		if (!title) {
			new Notice("Vikunja: nothing to create — no task text found.");
			return;
		}

		const labelIds = await ensureDefaultLabelIds(plugin, client);
		const task = await createOneTask(plugin, client, title, labelIds);
		const url = taskWebUrl(plugin.settings.baseUrl, task.id);
		replaceLine(editor, lineIndex, rewriteLineWithTask(lineText, task.id, url));
		new Notice(`Vikunja: created task #${task.id}.`);

		if (plugin.settings.openInBrowserAfterCreate) {
			window.open(url, "_blank");
		}
	} catch (err) {
		new Notice(`Vikunja: ${describeVikunjaError(err)}`);
	}
}

/**
 * "Push all open tasks in note to Vikunja": creates a task for every unchecked
 * `- [ ]` line that has no marker yet, rewrites each in place, and reports a
 * summary. Already-marked open tasks are skipped, never duplicated.
 */
export async function pushAllOpenTasks(
	plugin: VikunjaNoteTasksPlugin,
	editor: Editor,
): Promise<void> {
	const client = plugin.getClient();
	try {
		client.ensureConfigured();
	} catch (err) {
		new Notice(`Vikunja: ${describeVikunjaError(err)}`);
		return;
	}

	const targets: number[] = [];
	let skipped = 0;
	const lineCount = editor.lineCount();
	for (let i = 0; i < lineCount; i++) {
		const text = editor.getLine(i);
		if (isUncheckedTaskLine(text)) {
			if (hasMarker(text)) skipped++;
			else targets.push(i);
		}
	}

	if (targets.length === 0) {
		const tail = skipped > 0 ? ` (${skipped} already captured)` : "";
		new Notice(`Vikunja: no unmarked open tasks found${tail}.`);
		return;
	}

	let created = 0;
	try {
		const labelIds = await ensureDefaultLabelIds(plugin, client);
		for (const i of targets) {
			const lineText = editor.getLine(i);
			// Re-check in case the note changed since scanning.
			if (hasMarker(lineText) || !isUncheckedTaskLine(lineText)) {
				skipped++;
				continue;
			}
			const title = extractTitle(lineText);
			if (!title) {
				skipped++;
				continue;
			}
			const task = await createOneTask(plugin, client, title, labelIds);
			const url = taskWebUrl(plugin.settings.baseUrl, task.id);
			replaceLine(editor, i, rewriteLineWithTask(lineText, task.id, url));
			created++;
		}
		new Notice(`Vikunja: ${summarize(created, skipped)}`);
	} catch (err) {
		new Notice(
			`Vikunja: ${describeVikunjaError(err)} Created ${created} before stopping.`,
		);
	}
}
