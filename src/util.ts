// Small pure helpers shared by the commands. Obsidian-free and unit-tested.

/** Splits a comma-separated list, trimming and dropping empties. */
export function parseCsvList(csv: string): string[] {
	return csv
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/** Case-insensitive de-duplication that preserves first-seen order. */
export function dedupeCaseInsensitive(items: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of items) {
		const key = item.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			out.push(item);
		}
	}
	return out;
}

/**
 * Reads the `vikunja-labels` frontmatter value. YAML gives a list when the user
 * writes one, but Obsidian's Properties editor and hand-written frontmatter both
 * produce a plain string often enough that a comma-separated string is accepted
 * too. Non-string scalars (a bare number) are stringified rather than dropped —
 * a label named `2026` is legitimate. Anything else yields no labels.
 */
export function parseFrontmatterLabels(value: unknown): string[] {
	if (value === undefined || value === null) return [];
	if (Array.isArray(value)) {
		return value
			.filter((item) => typeof item === "string" || typeof item === "number")
			.map((item) => String(item).trim())
			.filter((item) => item.length > 0);
	}
	if (typeof value === "string") return parseCsvList(value);
	if (typeof value === "number") return [String(value)];
	return [];
}

/**
 * Turns a `YYYY-MM-DD` date into the RFC3339 timestamp Vikunja stores, anchored
 * to **local midnight** on that date.
 *
 * The offset is passed in (as `Date#getTimezoneOffset` reports it: minutes
 * *behind* UTC, so UTC-7 is +420) rather than read here, which keeps this
 * function pure and testable. Sending a bare `T00:00:00Z` instead would land the
 * task on the previous day for anyone west of UTC — the whole point of carrying
 * the offset is that "due the 10th" stays the 10th.
 */
export function dueDateToRfc3339(ymd: string, offsetMinutes: number): string {
	if (offsetMinutes === 0) return `${ymd}T00:00:00Z`;
	const sign = offsetMinutes > 0 ? "-" : "+";
	const total = Math.abs(offsetMinutes);
	const hours = String(Math.floor(total / 60)).padStart(2, "0");
	const minutes = String(total % 60).padStart(2, "0");
	return `${ymd}T00:00:00${sign}${hours}:${minutes}`;
}

/** Summarises a batch outcome, e.g. "Created 3, skipped 1." */
export function summarize(created: number, skipped: number): string {
	const c = `Created ${created}`;
	const s = `skipped ${skipped}`;
	return `${c}, ${s}.`;
}
