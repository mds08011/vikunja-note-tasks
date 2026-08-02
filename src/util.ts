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

/** Summarises a batch outcome, e.g. "Created 3, skipped 1." */
export function summarize(created: number, skipped: number): string {
	const c = `Created ${created}`;
	const s = `skipped ${skipped}`;
	return `${c}, ${s}.`;
}
