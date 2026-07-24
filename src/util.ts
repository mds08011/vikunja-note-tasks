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

/** Summarises a batch outcome, e.g. "Created 3, skipped 1." */
export function summarize(created: number, skipped: number): string {
	const c = `Created ${created}`;
	const s = `skipped ${skipped}`;
	return `${c}, ${s}.`;
}
