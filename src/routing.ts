// Capture routing: deciding which Vikunja project a new task belongs in.
//
// This module has NO Obsidian import on purpose (same invariant as markers.ts
// and render.ts) — it takes plain strings and returns a plain result, so the
// whole resolution order is unit-testable without mocking a vault. The glue that
// reads frontmatter and settings lives in commands.ts.
//
// Resolution order (documented in USER_GUIDE.md, "Frontmatter contract"):
//   1. `vikunja-project` in the note's frontmatter — authoritative
//   2. the first matching folder rule, in the order the user listed them
//   3. the default project from settings

/** One folder rule: a glob pattern and the project it routes to. */
export interface FolderMapping {
	pattern: string;
	projectId: number;
}

/** A rule line that could not be parsed, reported back to the settings UI. */
export interface FolderMappingError {
	/** 1-based line number within the settings textarea. */
	line: number;
	text: string;
	reason: string;
}

export interface ParsedFolderMappings {
	mappings: FolderMapping[];
	errors: FolderMappingError[];
}

/** Where a routing decision came from, for the user-facing Notice. */
export type ProjectSource = "frontmatter" | "folder" | "default";

export type RouteOutcome =
	| {
			ok: true;
			projectId: number;
			source: ProjectSource;
			/** The rule that matched, when `source` is "folder". */
			pattern?: string;
	  }
	| { ok: false; reason: "invalid-frontmatter"; raw: string }
	| { ok: false; reason: "unrouted" };

/**
 * The folder a note lives in, as a POSIX path with no trailing slash. A note at
 * the vault root yields "".
 */
export function folderPathOf(notePath: string): string {
	const normalized = notePath.replace(/\\/g, "/").replace(/^\/+/, "");
	const cut = normalized.lastIndexOf("/");
	return cut === -1 ? "" : normalized.slice(0, cut);
}

/** Escapes the regex metacharacters that are NOT glob syntax to us. */
function escapeLiteral(text: string): string {
	return text.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compiles a glob to an anchored, case-insensitive regex.
 *
 * - `**` crosses `/`; a leading `**​/` is optional, so `**​/1204 *` also matches
 *   `1204 Website` at the vault root.
 * - a trailing `/**` is optional too, so `Clients/**` matches `Clients` itself
 *   as well as everything under it.
 * - `*` matches within one path segment; `?` matches one non-`/` character.
 */
function globToRegExp(pattern: string): RegExp {
	let body = "";
	let i = 0;
	while (i < pattern.length) {
		if (pattern.startsWith("**/", i)) {
			body += "(?:.*/)?"; // optional leading/interior "any folders"
			i += 3;
		} else if (pattern.startsWith("/**", i) && i + 3 === pattern.length) {
			body += "(?:/.*)?"; // optional trailing "and everything under it"
			i += 3;
		} else if (pattern.startsWith("**", i)) {
			body += ".*";
			i += 2;
		} else if (pattern[i] === "*") {
			body += "[^/]*";
			i += 1;
		} else if (pattern[i] === "?") {
			body += "[^/]";
			i += 1;
		} else {
			body += escapeLiteral(pattern[i]);
			i += 1;
		}
	}
	return new RegExp(`^${body}$`, "i");
}

/**
 * Does a folder rule match the folder a note lives in?
 *
 * A pattern with **no `/`** is matched against each individual folder *name*, so
 * `1204 *` matches `Active/1204 Website/Notes` — moving that job folder between
 * `Active/` and `Archive/` never breaks routing. A pattern **containing `/`** is
 * matched against the whole folder path instead.
 */
export function matchesFolderPattern(
	pattern: string,
	folderPath: string,
): boolean {
	const trimmed = pattern.trim();
	if (!trimmed) return false;
	const path = folderPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	const re = globToRegExp(trimmed);
	if (!trimmed.includes("/")) {
		if (path === "") return false; // root-level note: no folder name to match
		return path.split("/").some((segment) => re.test(segment));
	}
	return re.test(path);
}

/**
 * Parses the folder-rules textarea. One rule per line, `pattern = projectId`.
 * Blank lines and `#` comments are skipped. Unparseable lines are reported
 * rather than silently dropped, so the settings tab can show them.
 */
export function parseFolderMappings(text: string): ParsedFolderMappings {
	const mappings: FolderMapping[] = [];
	const errors: FolderMappingError[] = [];
	const lines = (text ?? "").split("\n");

	lines.forEach((rawLine, index) => {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) return;

		const cut = line.lastIndexOf("=");
		if (cut === -1) {
			errors.push({
				line: index + 1,
				text: line,
				reason: 'expected "pattern = projectId"',
			});
			return;
		}

		const pattern = line.slice(0, cut).trim();
		const idText = line.slice(cut + 1).trim();
		if (!pattern) {
			errors.push({ line: index + 1, text: line, reason: "empty pattern" });
			return;
		}
		const projectId = parseProjectId(idText);
		if (projectId === null) {
			errors.push({
				line: index + 1,
				text: line,
				reason: `"${idText}" is not a numeric project ID`,
			});
			return;
		}
		mappings.push({ pattern, projectId });
	});

	return { mappings, errors };
}

/**
 * Reads a project ID from a frontmatter value or a rule's right-hand side.
 * Accepts a positive integer as a number or a numeric string; returns `null` for
 * anything else (a project *name*, a float, zero, a negative).
 */
export function parseProjectId(value: unknown): number | null {
	if (typeof value === "number") {
		return Number.isInteger(value) && value > 0 ? value : null;
	}
	if (typeof value === "string") {
		const text = value.trim();
		if (!/^\d+$/.test(text)) return null;
		const parsed = parseInt(text, 10);
		return parsed > 0 ? parsed : null;
	}
	return null;
}

/**
 * Applies the resolution order and reports which step won.
 *
 * A `vikunja-project` key that is present but *not* a usable ID is an error, not
 * a reason to fall through: silently creating the task in the default project
 * would put it somewhere the note explicitly said it should not go. An absent
 * or empty key (Obsidian's Properties editor readily leaves those behind) is
 * simply "no opinion" and falls through normally.
 */
export function resolveProject(input: {
	frontmatterValue: unknown;
	folderPath: string;
	mappings: FolderMapping[];
	defaultProjectId: number | null;
}): RouteOutcome {
	const { frontmatterValue, folderPath, mappings, defaultProjectId } = input;

	const hasFrontmatterValue =
		frontmatterValue !== undefined &&
		frontmatterValue !== null &&
		!(typeof frontmatterValue === "string" && frontmatterValue.trim() === "");

	if (hasFrontmatterValue) {
		const fromNote = parseProjectId(frontmatterValue);
		if (fromNote === null) {
			return {
				ok: false,
				reason: "invalid-frontmatter",
				raw: String(frontmatterValue),
			};
		}
		return { ok: true, projectId: fromNote, source: "frontmatter" };
	}

	for (const mapping of mappings) {
		if (matchesFolderPattern(mapping.pattern, folderPath)) {
			return {
				ok: true,
				projectId: mapping.projectId,
				source: "folder",
				pattern: mapping.pattern,
			};
		}
	}

	if (defaultProjectId !== null) {
		return { ok: true, projectId: defaultProjectId, source: "default" };
	}
	return { ok: false, reason: "unrouted" };
}
