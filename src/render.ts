// Pure rendering helpers for the read-only "today" callout.
//
// Like markers.ts, this module is Obsidian-free and deterministic so it can be
// unit-tested directly (see tests/render.test.ts). All time-dependent inputs
// (the "generated on" date) are passed in rather than read from the clock.

import type { VikunjaTask } from "./types";
import { TODAY_BLOCK_BEGIN, TODAY_BLOCK_END } from "./markers";

const PRIORITY_NAMES: Record<number, string> = {
	1: "Low",
	2: "Medium",
	3: "High",
	4: "Urgent",
	5: "DO NOW",
};

/** True when a Vikunja RFC3339 date string represents a real (set) date. */
export function hasRealDate(iso: string | undefined | null): boolean {
	if (!iso) return false;
	// Vikunja encodes "unset" as the year-0001 zero time.
	return !iso.startsWith("0001-01-01");
}

/** Formats a Vikunja date as YYYY-MM-DD, or "" when unset. */
export function formatDate(iso: string | undefined | null): string {
	if (!hasRealDate(iso)) return "";
	return (iso as string).slice(0, 10);
}

/** Human-readable priority name, or "" for unset/none. */
export function priorityLabel(priority: number | undefined | null): string {
	if (!priority || priority <= 0) return "";
	return PRIORITY_NAMES[priority] ?? `Priority ${priority}`;
}

/** Builds the web-UI URL for a task from the configured base URL. */
export function taskWebUrl(baseUrl: string, taskId: number): string {
	return `${baseUrl.replace(/\/+$/, "")}/tasks/${taskId}`;
}

/** Escapes the pipe and bracket characters that would break callout Markdown. */
function inlineSafe(text: string): string {
	return text.replace(/([\[\]|])/g, "\\$1");
}

export interface TodayCalloutOptions {
	baseUrl: string;
	/** YYYY-MM-DD the block was generated; shown in the callout subtitle. */
	generatedOn: string;
	/** Whether undated tasks were included, for an honest subtitle. */
	includeUndated: boolean;
}

/**
 * Renders the full today block: the begin/end comment fences wrapping a
 * read-only Markdown callout that lists each task's title, due date, priority,
 * and a web-UI link. Re-running the command replaces this whole block.
 */
export function renderTodayBlock(
	tasks: VikunjaTask[],
	opts: TodayCalloutOptions,
): string {
	const lines: string[] = [];
	lines.push(TODAY_BLOCK_BEGIN);
	lines.push("> [!todo] Vikunja — due today & overdue");

	const scope = opts.includeUndated ? ", including undated" : "";
	lines.push(
		`> *Read-only snapshot generated ${opts.generatedOn}${scope}. ` +
			`Re-run "Insert today's Vikunja tasks" to refresh.*`,
	);
	lines.push(">");

	if (tasks.length === 0) {
		lines.push("> No tasks due today or overdue.");
	} else {
		for (const task of tasks) {
			const parts: string[] = [`**${inlineSafe(task.title)}**`];
			const due = formatDate(task.due_date);
			if (due) parts.push(`due ${due}`);
			else parts.push("no due date");
			const prio = priorityLabel(task.priority);
			if (prio) parts.push(`${prio} priority`);
			parts.push(`[open](${taskWebUrl(opts.baseUrl, task.id)})`);
			lines.push(`> - ${parts.join(" · ")}`);
		}
	}

	lines.push(TODAY_BLOCK_END);
	return lines.join("\n");
}
