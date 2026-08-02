import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseCsvList,
	dedupeCaseInsensitive,
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
