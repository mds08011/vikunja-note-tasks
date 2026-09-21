// Which heading a line sits under.
//
// This module has NO Obsidian import on purpose (same invariant as markers.ts,
// render.ts and routing.ts): it takes an array of lines and returns an array of
// headings, so section routing is unit-testable without mocking an editor.
//
// It exists for one workflow. A dictated capture, polished into Markdown by a
// transcription app, arrives grouped under headings — one per job, plus a
// catch-all. Every task in it is real work, but they belong to different
// projects, and splitting that by hand at paste time is the tedious step the
// capture was supposed to remove.

/** ATX heading: one to six `#`, a space, then the text. */
const HEADING = /^(#{1,6})\s+(.*)$/;

/** A fence opens or closes at ``` or ~~~, with any info string after it. */
const FENCE = /^\s*(```+|~~~+)/;

/**
 * For each line, the text of the nearest heading above it, or `null` when the
 * line sits before the first heading.
 *
 * Headings inside fenced code blocks are ignored. A capture that quotes a shell
 * session — `# rebuild the index` — would otherwise re-route every task below
 * it, and the failure would be invisible in the rendered note, which shows that
 * line as code rather than as a heading.
 *
 * The heading's own line reports the heading *above* it, not itself: a rule is
 * about the section a task is in, and a heading line is never a task line.
 */
export function headingsForLines(lines: string[]): (string | null)[] {
	const result: (string | null)[] = [];
	let current: string | null = null;
	let fence: string | null = null;

	for (const line of lines) {
		result.push(current);

		const fenceMatch = FENCE.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1][0].repeat(3);
			if (fence === null) {
				fence = marker;
			} else if (marker === fence) {
				fence = null;
			}
			continue;
		}
		if (fence !== null) continue;

		const headingMatch = HEADING.exec(line);
		if (headingMatch) {
			current = headingMatch[2].trim();
		}
	}

	return result;
}

/**
 * Strips Markdown decoration a heading may carry, so a rule can be written
 * against what the heading *says*.
 *
 * `## **6100 El Toro**` and `## 6100 El Toro` are the same section to a human,
 * and a routing rule that distinguished them would be a trap — especially with
 * headings written by a language model, which varies its emphasis freely
 * between runs.
 */
export function headingText(heading: string): string {
	return heading
		.replace(/`([^`]*)`/g, "$1")
		.replace(/\*\*([^*]*)\*\*/g, "$1")
		.replace(/\*([^*]*)\*/g, "$1")
		.replace(/__([^_]*)__/g, "$1")
		.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_m, target, alias) =>
			(alias ?? target).trim(),
		)
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/#+\s*$/, "")
		.trim();
}
