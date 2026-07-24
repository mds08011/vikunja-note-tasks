import { test } from "node:test";
import assert from "node:assert/strict";
import {
	hasRealDate,
	formatDate,
	priorityLabel,
	taskWebUrl,
	renderTodayBlock,
} from "../src/render.ts";
import { findTodayBlock } from "../src/markers.ts";
import type { VikunjaTask } from "../src/types.ts";

test("hasRealDate rejects unset and empty dates", () => {
	assert.equal(hasRealDate("2026-07-24T00:00:00Z"), true);
	assert.equal(hasRealDate("0001-01-01T00:00:00Z"), false);
	assert.equal(hasRealDate(""), false);
	assert.equal(hasRealDate(undefined), false);
	assert.equal(hasRealDate(null), false);
});

test("formatDate returns YYYY-MM-DD or empty", () => {
	assert.equal(formatDate("2026-07-24T13:45:00Z"), "2026-07-24");
	assert.equal(formatDate("0001-01-01T00:00:00Z"), "");
});

test("priorityLabel maps known priorities and ignores unset", () => {
	assert.equal(priorityLabel(0), "");
	assert.equal(priorityLabel(undefined), "");
	assert.equal(priorityLabel(1), "Low");
	assert.equal(priorityLabel(3), "High");
	assert.equal(priorityLabel(5), "DO NOW");
});

test("taskWebUrl builds a clean URL regardless of trailing slash", () => {
	assert.equal(taskWebUrl("https://v.example.com", 12), "https://v.example.com/tasks/12");
	assert.equal(taskWebUrl("https://v.example.com/", 12), "https://v.example.com/tasks/12");
});

function task(partial: Partial<VikunjaTask>): VikunjaTask {
	return { id: 1, title: "Task", done: false, ...partial };
}

test("renderTodayBlock wraps a fenced, replaceable callout", () => {
	const block = renderTodayBlock(
		[task({ id: 12, title: "Order rebar", due_date: "2026-07-24T00:00:00Z", priority: 3 })],
		{ baseUrl: "https://v.example.com", generatedOn: "2026-07-24", includeUndated: false },
	);
	// Block is self-fencing so re-runs replace instead of duplicate.
	assert.ok(findTodayBlock(block));
	// Every callout line is quoted.
	for (const line of block.split("\n").slice(1, -1)) {
		assert.ok(line.startsWith(">"), `expected quoted line, got: ${line}`);
	}
	assert.match(block, /\[!todo\]/);
	assert.match(block, /Order rebar/);
	assert.match(block, /due 2026-07-24/);
	assert.match(block, /High priority/);
	assert.match(block, /https:\/\/v\.example\.com\/tasks\/12/);
});

test("renderTodayBlock reports an empty result honestly", () => {
	const block = renderTodayBlock([], {
		baseUrl: "https://v.example.com",
		generatedOn: "2026-07-24",
		includeUndated: true,
	});
	assert.match(block, /No tasks due today or overdue/);
	assert.match(block, /including undated/);
});

test("renderTodayBlock escapes pipes and brackets in titles", () => {
	const block = renderTodayBlock([task({ title: "A | B [c]" })], {
		baseUrl: "https://v.example.com",
		generatedOn: "2026-07-24",
		includeUndated: false,
	});
	assert.match(block, /A \\\| B \\\[c\\\]/);
});
