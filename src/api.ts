// Thin, hand-written typed client for the Vikunja REST API.
//
// This is the ONLY module that performs network I/O, and it does so exclusively
// through Obsidian's `requestUrl` (never fetch/axios) so the plugin works on
// mobile without CORS problems. Keeping all I/O here means the risky string
// logic lives in the pure, unit-tested modules (markers.ts, render.ts).
//
// API STRATEGY (see docs/adr/0003-v2-first-api-strategy.md and
// docs/api-notes.md): Vikunja 2.4.0 introduced a v2 API, but as of writing the
// endpoints this plugin needs (project listing, task create/update, labels,
// filtered task listing) exist ONLY on v1. So every call below targets
// `/api/v1`. The base path is a single constant to make migrating individual
// calls to `/api/v2` — as they land upstream — a one-line change per method.

import { requestUrl } from "obsidian";
import type {
	VikunjaProject,
	VikunjaLabel,
	VikunjaTask,
	NewTaskPayload,
} from "./types";

/** The API version segment. Isolated so a future v2 migration is trivial. */
const API_BASE = "/api/v1";

/** Classes of failure, each mapped to a distinct plain-language Notice upstream. */
export type VikunjaErrorKind =
	| "config" // base URL or token not set
	| "auth" // 401 / 403
	| "network" // could not reach the server at all
	| "not-found" // 404 (deleted/invalid task or project)
	| "invalid-request" // 400 / 422 (bad project, malformed input)
	| "server" // 5xx
	| "unknown";

/** A typed error carrying the failure class and (when available) HTTP status. */
export class VikunjaApiError extends Error {
	readonly kind: VikunjaErrorKind;
	readonly status?: number;

	constructor(kind: VikunjaErrorKind, message: string, status?: number) {
		super(message);
		this.name = "VikunjaApiError";
		this.kind = kind;
		this.status = status;
	}

	/** Maps an HTTP status (and optional server message) to a typed error. */
	static fromStatus(status: number, serverMessage?: string): VikunjaApiError {
		const detail = serverMessage ? ` (${serverMessage})` : "";
		if (status === 401 || status === 403) {
			return new VikunjaApiError(
				"auth",
				`Vikunja rejected the API token${detail}.`,
				status,
			);
		}
		if (status === 404) {
			return new VikunjaApiError(
				"not-found",
				`Vikunja returned "not found"${detail}.`,
				status,
			);
		}
		if (status === 400 || status === 422) {
			return new VikunjaApiError(
				"invalid-request",
				`Vikunja rejected the request${detail}.`,
				status,
			);
		}
		if (status >= 500) {
			return new VikunjaApiError(
				"server",
				`Vikunja server error${detail}.`,
				status,
			);
		}
		return new VikunjaApiError(
			"unknown",
			`Unexpected Vikunja response (HTTP ${status})${detail}.`,
			status,
		);
	}
}

export interface VikunjaClientConfig {
	baseUrl: string;
	token: string;
}

/**
 * Turns any thrown value into a single plain-language sentence suitable for a
 * Notice. `VikunjaApiError` messages are already user-facing and distinct per
 * failure class, so they pass straight through.
 */
export function describeVikunjaError(err: unknown): string {
	if (err instanceof VikunjaApiError) return err.message;
	if (err instanceof Error) return err.message;
	return String(err);
}

/** Attempts to pull a human message out of a Vikunja error body. */
function serverMessageOf(body: unknown): string | undefined {
	if (body && typeof body === "object") {
		const obj = body as Record<string, unknown>;
		const msg = obj.message ?? obj.error;
		if (typeof msg === "string") return msg;
	}
	return undefined;
}

export class VikunjaClient {
	private readonly root: string;
	private readonly token: string;

	constructor(config: VikunjaClientConfig) {
		const base = (config.baseUrl ?? "").trim().replace(/\/+$/, "");
		this.root = base ? base + API_BASE : "";
		this.token = (config.token ?? "").trim();
		// Constructing with missing config is allowed; callers guard with
		// ensureConfigured() before the first request.
	}

	/** Throws a `config` error when base URL or token is missing. */
	ensureConfigured(): void {
		if (!this.root || !this.token) {
			throw new VikunjaApiError(
				"config",
				"Set your Vikunja base URL and API token in the plugin settings first.",
			);
		}
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown,
	): Promise<T> {
		this.ensureConfigured();
		const url = this.root + path;

		let response;
		try {
			response = await requestUrl({
				url,
				method,
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				throw: false,
			});
		} catch (err) {
			// requestUrl throws for DNS/offline/TLS problems — a true network fault.
			const detail = err instanceof Error ? err.message : String(err);
			throw new VikunjaApiError(
				"network",
				`Could not reach Vikunja at ${this.root}. Check the URL and your connection (${detail}).`,
			);
		}

		if (response.status >= 200 && response.status < 300) {
			// 204/empty bodies are valid for some endpoints.
			if (!response.text) return undefined as unknown as T;
			try {
				return response.json as T;
			} catch {
				return undefined as unknown as T;
			}
		}

		let serverMessage: string | undefined;
		try {
			serverMessage = serverMessageOf(response.json);
		} catch {
			serverMessage = response.text ? response.text.slice(0, 200) : undefined;
		}
		throw VikunjaApiError.fromStatus(response.status, serverMessage);
	}

	private async getPaged<T>(path: string): Promise<T[]> {
		const perPage = 100;
		const maxPages = 50; // safety cap
		const all: T[] = [];
		for (let page = 1; page <= maxPages; page++) {
			const sep = path.includes("?") ? "&" : "?";
			const pagePath = `${path}${sep}page=${page}&per_page=${perPage}`;
			const batch = await this.request<T[] | null>("GET", pagePath);
			if (!Array.isArray(batch) || batch.length === 0) break;
			all.push(...batch);
			if (batch.length < perPage) break;
		}
		return all;
	}

	/** GET /projects — list all projects the token can see. */
	async listProjects(): Promise<VikunjaProject[]> {
		return this.getPaged<VikunjaProject>("/projects");
	}

	/** GET /labels — list all labels the token can see. */
	async listLabels(): Promise<VikunjaLabel[]> {
		return this.getPaged<VikunjaLabel>("/labels");
	}

	/** PUT /projects/{id}/tasks — create a task in a project. */
	async createTask(
		projectId: number,
		payload: NewTaskPayload,
	): Promise<VikunjaTask> {
		return this.request<VikunjaTask>(
			"PUT",
			`/projects/${projectId}/tasks`,
			payload,
		);
	}

	/** GET /tasks/{id} — fetch a single task (used to read done-state). */
	async getTask(taskId: number): Promise<VikunjaTask> {
		return this.request<VikunjaTask>("GET", `/tasks/${taskId}`);
	}

	/** POST /tasks/{id} — partial update; here used to set the done flag. */
	async setTaskDone(taskId: number, done: boolean): Promise<VikunjaTask> {
		return this.request<VikunjaTask>("POST", `/tasks/${taskId}`, { done });
	}

	/** PUT /tasks/{id}/labels — attach an existing label to a task. */
	async addLabelToTask(taskId: number, labelId: number): Promise<void> {
		await this.request<unknown>("PUT", `/tasks/${taskId}/labels`, {
			label_id: labelId,
		});
	}

	/** PUT /labels — create a new label, returning it. */
	async createLabel(title: string): Promise<VikunjaLabel> {
		return this.request<VikunjaLabel>("PUT", "/labels", { title });
	}

	/**
	 * GET /tasks — tasks due today or overdue and not done.
	 *
	 * The server filter returns overdue + due-today open tasks. Whether tasks
	 * with no due date are returned depends on the instance's null-date handling,
	 * so we also filter client-side (see main.ts) using the caller's
	 * `includeUndated` preference. `filter_timezone` anchors `now/d` to the
	 * user's local day. See docs/api-notes.md for the filter-syntax notes.
	 */
	async listTodayTasks(timezone: string): Promise<VikunjaTask[]> {
		const filter = encodeURIComponent("done = false && due_date <= now/d+1d");
		const tz = encodeURIComponent(timezone);
		const path = `/tasks?filter=${filter}&filter_timezone=${tz}&sort_by=due_date&order_by=asc`;
		return this.getPaged<VikunjaTask>(path);
	}
}
