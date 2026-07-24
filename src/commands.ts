import { Editor, Notice } from "obsidian";
import type VikunjaNoteTasksPlugin from "./main";
import { VikunjaClient, VikunjaApiError, describeVikunjaError } from "./api";
import {
	extractTitle,
	findTodayBlock,
	getCheckboxState,
	getMarkerId,
	hasMarker,
	isUncheckedTaskLine,
	rewriteLineWithTask,
	setCheckboxState,
} from "./markers";
import { hasRealDate, renderTodayBlock, taskWebUrl } from "./render";
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

/**
 * Shared implementation for the two done-state commands. `mode: "done"` always
 * sets done; `mode: "toggle"` flips based on the current local checkbox state.
 * Sets the state in Vikunja first, then mirrors it onto the local checkbox.
 */
export async function setTaskDoneOnLine(
	plugin: VikunjaNoteTasksPlugin,
	editor: Editor,
	mode: "done" | "toggle",
): Promise<void> {
	try {
		const client = plugin.getClient();
		client.ensureConfigured();

		const lineIndex = editor.getCursor("from").line;
		const lineText = editor.getLine(lineIndex);
		const id = getMarkerId(lineText);
		if (id === null) {
			new Notice("Vikunja: no task marker on this line.");
			return;
		}

		const current = getCheckboxState(lineText) ?? false;
		const newDone = mode === "done" ? true : !current;

		await client.setTaskDone(id, newDone);

		const updated = setCheckboxState(lineText, newDone);
		if (updated !== lineText) {
			replaceLine(editor, lineIndex, updated);
		}
		new Notice(
			`Vikunja: task #${id} marked ${newDone ? "done" : "not done"}.`,
		);
	} catch (err) {
		new Notice(`Vikunja: ${describeVikunjaError(err)}`);
	}
}

/**
 * "Refresh Vikunja task statuses in note": for every marker, fetch the current
 * done-state and mirror it onto the local checkbox. Vikunja is authoritative
 * here — but a task that 404s (deleted remotely) is only *reported*; its line is
 * never altered or deleted.
 */
export async function refreshStatuses(
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

	const markers: { line: number; id: number }[] = [];
	const lineCount = editor.lineCount();
	for (let i = 0; i < lineCount; i++) {
		const id = getMarkerId(editor.getLine(i));
		if (id !== null) markers.push({ line: i, id });
	}

	if (markers.length === 0) {
		new Notice("Vikunja: no task markers in this note.");
		return;
	}

	let updated = 0;
	let unchanged = 0;
	const missing: number[] = [];
	try {
		for (const marker of markers) {
			let done: boolean;
			try {
				done = (await client.getTask(marker.id)).done;
			} catch (err) {
				if (err instanceof VikunjaApiError && err.kind === "not-found") {
					missing.push(marker.id);
					continue; // never touch the line for a deleted task
				}
				throw err;
			}
			const lineText = editor.getLine(marker.line);
			const next = setCheckboxState(lineText, done);
			if (next !== lineText) {
				replaceLine(editor, marker.line, next);
				updated++;
			} else {
				unchanged++;
			}
		}
	} catch (err) {
		new Notice(
			`Vikunja: ${describeVikunjaError(err)} Stopped after updating ${updated}.`,
		);
		return;
	}

	let message = `refreshed — ${updated} updated, ${unchanged} unchanged`;
	if (missing.length > 0) {
		message +=
			`; ${missing.length} not found in Vikunja ` +
			`(IDs ${missing.join(", ")}), lines left untouched`;
	}
	new Notice(`Vikunja: ${message}.`);
}

/** Local calendar date as YYYY-MM-DD (not UTC), for the block subtitle. */
function localToday(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Orders tasks by due date ascending, with undated tasks last. */
function sortByDue(a: VikunjaTask, b: VikunjaTask): number {
	const ad = hasRealDate(a.due_date);
	const bd = hasRealDate(b.due_date);
	if (ad && bd) return (a.due_date as string).localeCompare(b.due_date as string);
	if (ad) return -1;
	if (bd) return 1;
	return 0;
}

/**
 * "Insert today's Vikunja tasks": fetches tasks due today or overdue (optionally
 * including undated) and writes a read-only callout fenced by begin/end comment
 * markers. Re-running replaces the existing block in place instead of
 * duplicating it.
 */
export async function insertTodayTasks(
	plugin: VikunjaNoteTasksPlugin,
	editor: Editor,
): Promise<void> {
	try {
		const client = plugin.getClient();
		client.ensureConfigured();

		const timezone =
			Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		const fetched = await client.listTodayTasks(timezone);

		const includeUndated = plugin.settings.includeUndated;
		const filtered = includeUndated
			? fetched
			: fetched.filter((t) => hasRealDate(t.due_date));
		const ordered = [...filtered].sort(sortByDue);

		const block = renderTodayBlock(ordered, {
			baseUrl: plugin.settings.baseUrl,
			generatedOn: localToday(),
			includeUndated,
		});

		const content = editor.getValue();
		const loc = findTodayBlock(content);
		if (loc) {
			editor.replaceRange(
				block,
				editor.offsetToPos(loc.start),
				editor.offsetToPos(loc.end),
			);
			new Notice(`Vikunja: updated today block (${ordered.length} task(s)).`);
		} else {
			const cursor = editor.getCursor();
			const prefix = cursor.ch === 0 ? "" : "\n";
			editor.replaceRange(`${prefix}${block}\n`, cursor);
			new Notice(`Vikunja: inserted today block (${ordered.length} task(s)).`);
		}
	} catch (err) {
		new Notice(`Vikunja: ${describeVikunjaError(err)}`);
	}
}
