import { test } from "node:test";
import assert from "node:assert/strict";
import {
	parseCsvList,
	dedupeCaseInsensitive,
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
