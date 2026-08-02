import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseCsvList,
	dedupeCaseInsensitive,
	dueDateToRfc3339,
	parseFrontmatterLabels,
	summarize,
} from "../src/util.ts";

test("parseCsvList trims and drops empties", () => {
	assert.deepEqual(parseCsvList("a, b ,c"), ["a", "b", "c"]);
	assert.deepEqual(parseCsvList(""), []);
	assert.deepEqual(parseCsvList(" , ,"), []);
	assert.deepEqual(parseCsvList("inbox"), ["inbox"]);
});

test("dedupeCaseInsensitive keeps first-seen order", () => {
	assert.deepEqual(dedupeCaseInsensitive(["A", "a", "B", "b", "A"]), ["A", "B"]);
	assert.deepEqual(dedupeCaseInsensitive([]), []);
	assert.deepEqual(dedupeCaseInsensitive(["one", "two"]), ["one", "two"]);
});

test("summarize renders the batch outcome", () => {
	assert.equal(summarize(3, 1), "Created 3, skipped 1.");
	assert.equal(summarize(0, 0), "Created 0, skipped 0.");
});

test("parseFrontmatterLabels reads YAML lists", () => {
	assert.deepEqual(parseFrontmatterLabels(["website", "q3"]), [
		"website",
		"q3",
	]);
	assert.deepEqual(parseFrontmatterLabels([" spaced ", ""]), ["spaced"]);
	assert.deepEqual(parseFrontmatterLabels([2026]), ["2026"]);
	assert.deepEqual(parseFrontmatterLabels([{ nope: 1 }, "ok"]), ["ok"]);
});

test("parseFrontmatterLabels accepts a comma-separated string", () => {
	assert.deepEqual(parseFrontmatterLabels("website, q3"), ["website", "q3"]);
	assert.deepEqual(parseFrontmatterLabels("solo"), ["solo"]);
	assert.deepEqual(parseFrontmatterLabels(""), []);
});

test("parseFrontmatterLabels yields nothing for absent or unusable values", () => {
	assert.deepEqual(parseFrontmatterLabels(undefined), []);
	assert.deepEqual(parseFrontmatterLabels(null), []);
	assert.deepEqual(parseFrontmatterLabels(true), []);
	assert.deepEqual(parseFrontmatterLabels({ a: 1 }), []);
	assert.deepEqual(parseFrontmatterLabels(7), ["7"]);
});

test("dueDateToRfc3339 anchors to local midnight", () => {
	// getTimezoneOffset is minutes BEHIND UTC: 420 is UTC-7.
	assert.equal(
		dueDateToRfc3339("2026-08-10", 420),
		"2026-08-10T00:00:00-07:00",
	);
	assert.equal(dueDateToRfc3339("2026-08-10", 0), "2026-08-10T00:00:00Z");
	// East of UTC the sign flips.
	assert.equal(
		dueDateToRfc3339("2026-08-10", -330),
		"2026-08-10T00:00:00+05:30",
	);
	assert.equal(
		dueDateToRfc3339("2026-08-10", -60),
		"2026-08-10T00:00:00+01:00",
	);
});

test("dueDateToRfc3339 keeps the calendar day it was given", () => {
	// The bug this guards: a bare Z timestamp would read as 2026-08-09 for
	// anyone west of UTC.
	for (const offset of [720, 420, 0, -330, -840]) {
		assert.ok(dueDateToRfc3339("2026-08-10", offset).startsWith("2026-08-10T"));
	}
});
