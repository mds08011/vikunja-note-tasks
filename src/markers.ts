// Pure string logic for the plugin's marker/line contract.
//
// NOTHING in this module touches the Obsidian API, the network, or the
// filesystem. Every function is a deterministic string transform so the whole
// module can be unit-tested without mocks (see tests/markers.test.ts).
//
// Marker format spec and line-rewrite invariants live in
// docs/DEVELOPER_GUIDE.md; keep the two in sync.

/**
 * The HTML-comment marker that binds a Markdown line to a Vikunja task id.
 * This marker — not the visible link — is the single source of truth for
 * idempotency: a line that already contains one is never created again.
 */
export const MARKER_RE = /<!--vk:(\d+)-->/;
const MARKER_RE_GLOBAL = /<!--vk:(\d+)-->/g;

/** The visible `[vk](url)` link that accompanies a marker. */
const VK_LINK_RE = /\[vk\]\([^)]*\)/g;

/**
 * A trailing "→ [[Wikilink]]" artifacts pointer (the ASCII "->" is also
 * accepted for convenience). Stripped from the task title and preserved at the
 * end of the line during rewrites.
 */
const TRAILING_POINTER_RE = /\s*(?:→|->)\s*\[\[[^\]]*\]\]\s*$/;

/**
 * A Markdown checkbox list item. Captures, in order:
 *   1: everything up to and including the opening "["  (indent + bullet + "[")
 *   2: the single state character (" ", "x", or "X")
 *   3: the "]" and following whitespace
 *   4: the body (task text and any artifacts)
 */
const CHECKBOX_RE = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/;

/** A plain (non-checkbox) list item: captures the bullet prefix and the body. */
const LIST_BULLET_RE = /^(\s*[-*+]\s+)(.*)$/;

/** Begin/end fences around the read-only "today" callout block. */
export const TODAY_BLOCK_BEGIN = "<!--vk:today:begin-->";
export const TODAY_BLOCK_END = "<!--vk:today:end-->";

/** Returns the Vikunja task id recorded on a line, or null if none. */
export function getMarkerId(line: string): number | null {
	const m = MARKER_RE.exec(line);
	return m ? parseInt(m[1], 10) : null;
}

/** True when the line already carries a marker. */
export function hasMarker(line: string): boolean {
	return MARKER_RE.test(line);
}

/** True when the line is a checkbox item that is currently unchecked. */
export function isUncheckedTaskLine(line: string): boolean {
	const cb = CHECKBOX_RE.exec(line);
	return cb !== null && cb[2] === " ";
}

/**
 * Returns the done-state of a checkbox line, or null when the line is not a
 * checkbox at all. Done maps to "x"/"X"; undone maps to " ".
 */
export function getCheckboxState(line: string): boolean | null {
	const cb = CHECKBOX_RE.exec(line);
	if (!cb) return null;
	return cb[2] === "x" || cb[2] === "X";
}

/**
 * Returns the line with its checkbox flipped to the requested state. Only the
 * single state character changes; indentation, bullet style, and body are left
 * byte-for-byte intact. Non-checkbox lines are returned unchanged.
 */
export function setCheckboxState(line: string, done: boolean): string {
	const cb = CHECKBOX_RE.exec(line);
	if (!cb) return line;
	return cb[1] + (done ? "x" : " ") + cb[3] + cb[4];
}

/**
 * Extracts the Vikunja task title from a line: strips checkbox syntax, any
 * existing `[vk](url)` link and marker, and any trailing "→ [[Wikilink]]"
 * pointer. All other text is kept verbatim; only whitespace left behind by the
 * removals is collapsed.
 */
export function extractTitle(line: string): string {
	let s: string;
	const cb = CHECKBOX_RE.exec(line);
	if (cb) {
		s = cb[4];
	} else {
		const bullet = LIST_BULLET_RE.exec(line);
		s = bullet ? bullet[2] : line.replace(/^\s+/, "");
	}
	s = s.replace(TRAILING_POINTER_RE, "");
	s = s.replace(VK_LINK_RE, " ");
	s = s.replace(MARKER_RE_GLOBAL, " ");
	return s.replace(/\s+/g, " ").trim();
}

/**
 * Rewrites a line to append the visible `[vk](url)` link and the `<!--vk:id-->`
 * marker, preserving indentation, bullet/checkbox syntax, and any trailing
 * "→ [[Wikilink]]" pointer (which stays at the very end of the line).
 *
 * This is a surgical transform of a single line; callers are responsible for
 * only invoking it on marker-free lines (idempotency is enforced upstream).
 */
export function rewriteLineWithTask(
	line: string,
	taskId: number,
	taskUrl: string,
): string {
	let head: string;
	let body: string;

	const cb = CHECKBOX_RE.exec(line);
	if (cb) {
		head = cb[1] + cb[2] + cb[3];
		body = cb[4];
	} else {
		const bullet = LIST_BULLET_RE.exec(line);
		if (bullet) {
			head = bullet[1];
			body = bullet[2];
		} else {
			const indent = /^(\s*)([\s\S]*)$/.exec(line)!;
			head = indent[1];
			body = indent[2];
		}
	}

	const ptr = body.match(TRAILING_POINTER_RE);
	const pointer = ptr ? ptr[0].trim() : "";
	let core = ptr ? body.slice(0, ptr.index) : body;
	core = core.replace(/\s+$/, "");

	const marker = `[vk](${taskUrl}) <!--vk:${taskId}-->`;
	let rebuilt = core.length > 0 ? `${head}${core} ${marker}` : `${head}${marker}`;
	if (pointer) rebuilt += ` ${pointer}`;
	return rebuilt;
}

/** Character offsets of the today block (begin..end inclusive), or null. */
export function findTodayBlock(
	content: string,
): { start: number; end: number } | null {
	const start = content.indexOf(TODAY_BLOCK_BEGIN);
	if (start === -1) return null;
	const endIdx = content.indexOf(TODAY_BLOCK_END, start);
	if (endIdx === -1) return null;
	return { start, end: endIdx + TODAY_BLOCK_END.length };
}

/**
 * Replaces an existing today block with `block`, returning the new content.
 * Returns null when no block is present, signalling the caller to insert at the
 * cursor instead of replacing.
 */
export function replaceTodayBlock(content: string, block: string): string | null {
	const loc = findTodayBlock(content);
	if (!loc) return null;
	return content.slice(0, loc.start) + block + content.slice(loc.end);
}
