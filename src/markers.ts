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
 * An Obsidian inline tag, used to derive Vikunja labels.
 *
 * The body must contain at least one non-digit, which is what keeps a bare job
 * number (`#1204`) or an issue reference from becoming a label. The tag must
 * also start the line or follow whitespace, so a URL fragment (`…/page#frag`)
 * and a Markdown heading (`# Heading` — a space follows the hash) never match.
 */
const TAG_BODY = "[A-Za-z0-9_\\-/]*[A-Za-z_\\-/][A-Za-z0-9_\\-/]*";
const TAG_RE_GLOBAL = new RegExp(`(?:^|\\s)#(${TAG_BODY})`, "g");

/**
 * A run of tags at the very end of a line. Only these are stripped from the
 * title — a tag used mid-sentence is part of the sentence.
 */
const TRAILING_TAGS_RE = new RegExp(`(?:\\s+#${TAG_BODY})+\\s*$`);

/**
 * Tasks-plugin emoji date fields.
 *
 * `DUE_EMOJI` are the three the Tasks plugin accepts for a due date; the wider
 * set covers its other dated fields (scheduled, start, created, done,
 * cancelled). We *read* only the due date, but all of them are metadata rather
 * than prose, so none belong in a Vikunja task title.
 *
 * Recurrence (🔁) is deliberately absent: its value is free text of unbounded
 * length ("every week on Tuesday"), so there is no safe way to strip it without
 * risking a bite out of the title.
 */
const DUE_EMOJI = "\\u{1F4C5}\\u{1F4C6}\\u{1F5D3}";
const OTHER_DATE_EMOJI = "\\u{23F3}\\u{231B}\\u{1F6EB}\\u{2795}\\u{2705}\\u{274C}";
/** Optional variation selector that many fonts/keyboards append. */
const VS16 = "\\u{FE0F}?";

const DUE_DATE_RE = new RegExp(
	`[${DUE_EMOJI}]${VS16}\\s*(\\d{4})-(\\d{2})-(\\d{2})`,
	"u",
);
const DATE_FIELD_RE = new RegExp(
	`\\s*[${DUE_EMOJI}${OTHER_DATE_EMOJI}]${VS16}\\s*\\d{4}-\\d{2}-\\d{2}`,
	"gu",
);

/** True for a calendar date that actually exists (leap years included). */
function isRealYmd(year: number, month: number, day: number): boolean {
	if (month < 1 || month > 12 || day < 1) return false;
	const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const max = month === 2 && leap ? 29 : lengths[month - 1];
	return day <= max;
}

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
 * existing `[vk](url)` link and marker, any trailing "→ [[Wikilink]]" pointer,
 * and any trailing run of `#tags` (those become labels instead). All other text
 * is kept verbatim — including a mid-sentence tag, which reads as prose — and
 * only whitespace left behind by the removals is collapsed.
 */
export function extractTitle(line: string, stripEmojiDates = true): string {
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
	// Emoji date fields go before tags, so either ordering of the two on a line
	// ("text #tag 📅 2026-08-10" or "text 📅 2026-08-10 #tag") leaves a clean title.
	if (stripEmojiDates) s = s.replace(DATE_FIELD_RE, " ");
	s = s.replace(/\s+/g, " ").trim();
	// Strip trailing tags last, once the pointer and marker are out of the way.
	// A line that is *only* a tag keeps it: stripping would leave no title.
	return s.replace(TRAILING_TAGS_RE, "").trim();
}

/**
 * Reads a Tasks-plugin due date (`📅 2026-08-10`) from a line, as `YYYY-MM-DD`,
 * or null when there isn't a usable one.
 *
 * A syntactically well-formed but impossible date (`2026-02-30`) returns null
 * and is left in the title rather than being silently corrected or sent on to
 * Vikunja — the user can see the text and fix it.
 */
export function extractDueDate(line: string): string | null {
	const m = DUE_DATE_RE.exec(line);
	if (!m) return null;
	const [, year, month, day] = m;
	if (!isRealYmd(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10))) {
		return null;
	}
	return `${year}-${month}-${day}`;
}

/**
 * Collects the Obsidian tags on a line, in order, without their leading `#`.
 * Tags anywhere on the line become labels; see `extractTitle` for which ones are
 * also removed from the title text.
 */
export function extractTags(line: string): string[] {
	const body = line.replace(VK_LINK_RE, " ").replace(MARKER_RE_GLOBAL, " ");
	const re = new RegExp(TAG_RE_GLOBAL.source, "g");
	const out: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(body)) !== null) {
		out.push(m[1]);
	}
	return out;
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
