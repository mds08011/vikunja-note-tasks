// Modal pickers. Obsidian-dependent by nature, so nothing here is imported by
// the pure modules (markers.ts, render.ts, routing.ts).

import { App, FuzzySuggestModal } from "obsidian";
import type { CachedProject } from "./main";

/**
 * A fuzzy picker over the known Vikunja projects.
 *
 * Reports the choice through a callback rather than returning it, because
 * Obsidian modals are fire-and-forget; `pickProject` wraps this in a promise.
 * Dismissing the modal reports `null` — a cancel, not a failure.
 */
class ProjectPickerModal extends FuzzySuggestModal<CachedProject> {
	private readonly projects: CachedProject[];
	private readonly onPick: (project: CachedProject | null) => void;
	private chose = false;

	constructor(
		app: App,
		projects: CachedProject[],
		onPick: (project: CachedProject | null) => void,
	) {
		super(app);
		this.projects = projects;
		this.onPick = onPick;
		this.setPlaceholder("Create the task in which Vikunja project?");
		this.emptyStateText = "No project matches that name.";
	}

	getItems(): CachedProject[] {
		return this.projects;
	}

	getItemText(project: CachedProject): string {
		return project.title;
	}

	onChooseItem(project: CachedProject): void {
		this.chose = true;
		this.onPick(project);
	}

	onClose(): void {
		super.onClose();
		// onClose also runs after a successful choice; only report a cancel when
		// nothing was chosen.
		if (!this.chose) this.onPick(null);
	}
}

/** Opens the project picker, resolving to the chosen project or null on cancel. */
export function pickProject(
	app: App,
	projects: CachedProject[],
): Promise<CachedProject | null> {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (project: CachedProject | null) => {
			if (settled) return;
			settled = true;
			resolve(project);
		};
		const modal = new ProjectPickerModal(app, projects, (project) => {
			if (project !== null) {
				settle(project);
				return;
			}
			// A cancel is only real if no choice arrives in the same tick. Obsidian
			// does not promise that onChooseItem runs before onClose, and resolving
			// null synchronously would silently swallow a choice on any version
			// that closes first.
			window.setTimeout(() => settle(null), 0);
		});
		modal.open();
	});
}
