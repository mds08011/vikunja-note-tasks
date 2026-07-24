import { Editor, Notice } from "obsidian";
import type VikunjaNoteTasksPlugin from "./main";
import { VikunjaClient, VikunjaApiError, describeVikunjaError } from "./api";
import { extractTitle, hasMarker, rewriteLineWithTask } from "./markers";
import { taskWebUrl } from "./render";
import { parseCsvList, dedupeCaseInsensitive } from "./util";
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

/** Creates a task in the default project and applies the default labels. */
async function createTaskWithDefaults(
	plugin: VikunjaNoteTasksPlugin,
	client: VikunjaClient,
	title: string,
): Promise<VikunjaTask> {
	const projectId = plugin.settings.defaultProjectId;
	if (projectId === null) {
		throw new VikunjaApiError(
			"config",
			"Choose a default project in the plugin settings first.",
		);
	}
	const task = await client.createTask(projectId, { title });
	const labelNames = dedupeCaseInsensitive(
		parseCsvList(plugin.settings.defaultLabels),
	);
	if (labelNames.length > 0) {
		const labelIds = await resolveLabelIds(client, labelNames);
		for (const id of labelIds) {
			await client.addLabelToTask(task.id, id);
		}
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

		const task = await createTaskWithDefaults(plugin, client, title);
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
