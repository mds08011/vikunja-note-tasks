// Shared data types for the Vikunja REST API and for internal rendering.
//
// This module has NO Obsidian import on purpose: it is consumed by the pure
// logic modules (markers.ts, render.ts) so their unit tests never need to mock
// the Obsidian API. See docs/DEVELOPER_GUIDE.md for the module map.

/** A Vikunja project. Only the fields this plugin relies on are typed. */
export interface VikunjaProject {
	id: number;
	title: string;
}

/** A Vikunja label. */
export interface VikunjaLabel {
	id: number;
	title: string;
}

/**
 * A Vikunja task. Vikunja returns many more fields; we type only what the
 * plugin reads or writes. Dates are RFC3339 strings; the "zero" date
 * (year 0001) means "unset".
 */
export interface VikunjaTask {
	id: number;
	title: string;
	done: boolean;
	done_at?: string;
	due_date?: string;
	priority?: number;
	project_id?: number;
	identifier?: string;
	index?: number;
}

/** Body accepted by the create-task endpoint. */
export interface NewTaskPayload {
	title: string;
	due_date?: string;
	priority?: number;
}
