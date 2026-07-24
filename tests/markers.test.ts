import { test } from "node:test";
import assert from "node:assert/strict";
import {
	getMarkerId,
	hasMarker,
	isUncheckedTaskLine,
	getCheckboxState,
	setCheckboxState,
	extractTitle,
	rewriteLineWithTask,
	findTodayBlock,
	replaceTodayBlock,
	TODAY_BLOCK_BEGIN,
	TODAY_BLOCK_END,
} from "../src/markers.ts";

test("getMarkerId reads the id from the marker", () => {
	assert.equal(getMarkerId("- [ ] Order rebar <!--vk:123-->"), 123);
	assert.equal(getMarkerId("- [ ] no marker here"), null);
	assert.equal(getMarkerId("plain text"), null);
});

test("hasMarker detects the marker regardless of link presence", () => {
	assert.equal(hasMarker("x <!--vk:1-->"), true);
	assert.equal(hasMarker("[vk](https://h/tasks/1) <!--vk:1-->"), true);
	assert.equal(hasMarker("- [ ] plain"), false);
});

test("isUncheckedTaskLine only matches unchecked checkboxes", () => {
	assert.equal(isUncheckedTaskLine("- [ ] todo"), true);
	assert.equal(isUncheckedTaskLine("    - [ ] indented"), true);
	assert.equal(isUncheckedTaskLine("* [ ] star bullet"), true);
	assert.equal(isUncheckedTaskLine("- [x] done"), false);
	assert.equal(isUncheckedTaskLine("- [X] done caps"), false);
	assert.equal(isUncheckedTaskLine("- not a checkbox"), false);
	assert.equal(isUncheckedTaskLine("plain line"), false);
});

test("getCheckboxState reports done/undone/non-checkbox", () => {
	assert.equal(getCheckboxState("- [ ] a"), false);
	assert.equal(getCheckboxState("- [x] a"), true);
	assert.equal(getCheckboxState("- [X] a"), true);
	assert.equal(getCheckboxState("- a"), null);
	assert.equal(getCheckboxState("plain"), null);
});

test("setCheckboxState flips only the state character", () => {
	assert.equal(setCheckboxState("- [ ] a", true), "- [x] a");
	assert.equal(setCheckboxState("- [x] a", false), "- [ ] a");
	assert.equal(
		setCheckboxState("   - [ ] deep <!--vk:9-->", true),
		"   - [x] deep <!--vk:9-->",
	);
	// Non-checkbox lines are untouched.
	assert.equal(setCheckboxState("plain", true), "plain");
});

test("extractTitle strips checkbox, link, marker, and pointer", () => {
	assert.equal(extractTitle("- [ ] Order rebar"), "Order rebar");
	assert.equal(
		extractTitle("- [ ] Order rebar [vk](https://h/tasks/12) <!--vk:12-->"),
		"Order rebar",
	);
	assert.equal(
		extractTitle("- [ ] Pour footing → [[Footing pour details]]"),
		"Pour footing",
	);
	assert.equal(
		extractTitle("- [ ] Call vendor -> [[Vendor notes]]"),
		"Call vendor",
	);
	// Kept verbatim: punctuation, numbers, mid-line brackets that are not links.
	assert.equal(
		extractTitle("- [ ] Review RFI #14 (structural) by Friday"),
		"Review RFI #14 (structural) by Friday",
	);
});

test("extractTitle handles plain and bulleted lines", () => {
	assert.equal(extractTitle("Just a plain line"), "Just a plain line");
	assert.equal(extractTitle("- bullet no checkbox"), "bullet no checkbox");
});

test("rewriteLineWithTask appends link and marker, preserving structure", () => {
	assert.equal(
		rewriteLineWithTask("- [ ] Order rebar", 123, "https://h/tasks/123"),
		"- [ ] Order rebar [vk](https://h/tasks/123) <!--vk:123-->",
	);
	// Indentation preserved.
	assert.equal(
		rewriteLineWithTask("    - [ ] deep", 5, "https://h/tasks/5"),
		"    - [ ] deep [vk](https://h/tasks/5) <!--vk:5-->",
	);
	// Bullet style preserved.
	assert.equal(
		rewriteLineWithTask("* [ ] star", 7, "https://h/tasks/7"),
		"* [ ] star [vk](https://h/tasks/7) <!--vk:7-->",
	);
});

test("rewriteLineWithTask keeps a trailing wikilink pointer at the end", () => {
	assert.equal(
		rewriteLineWithTask(
			"- [ ] Pour footing → [[Footing pour details]]",
			9,
			"https://h/tasks/9",
		),
		"- [ ] Pour footing [vk](https://h/tasks/9) <!--vk:9--> → [[Footing pour details]]",
	);
});

test("rewriteLineWithTask handles non-checkbox and plain lines", () => {
	assert.equal(
		rewriteLineWithTask("- bullet task", 3, "https://h/tasks/3"),
		"- bullet task [vk](https://h/tasks/3) <!--vk:3-->",
	);
	assert.equal(
		rewriteLineWithTask("Plain line task", 4, "https://h/tasks/4"),
		"Plain line task [vk](https://h/tasks/4) <!--vk:4-->",
	);
});

test("rewrite then getMarkerId is a stable round-trip (idempotency guard)", () => {
	const original = "- [ ] Some task";
	const rewritten = rewriteLineWithTask(original, 42, "https://h/tasks/42");
	assert.equal(hasMarker(original), false);
	assert.equal(hasMarker(rewritten), true);
	assert.equal(getMarkerId(rewritten), 42);
});

test("findTodayBlock locates the fenced block", () => {
	const content = `intro\n${TODAY_BLOCK_BEGIN}\n> body\n${TODAY_BLOCK_END}\noutro`;
	const loc = findTodayBlock(content);
	assert.ok(loc);
	assert.equal(content.slice(loc!.start, loc!.end).startsWith(TODAY_BLOCK_BEGIN), true);
	assert.equal(content.slice(loc!.start, loc!.end).endsWith(TODAY_BLOCK_END), true);
	assert.equal(findTodayBlock("no block here"), null);
});

test("replaceTodayBlock swaps the block in place, or returns null", () => {
	const content = `a\n${TODAY_BLOCK_BEGIN}\nold\n${TODAY_BLOCK_END}\nb`;
	const next = replaceTodayBlock(content, `${TODAY_BLOCK_BEGIN}\nnew\n${TODAY_BLOCK_END}`);
	assert.equal(next, `a\n${TODAY_BLOCK_BEGIN}\nnew\n${TODAY_BLOCK_END}\nb`);
	assert.equal(replaceTodayBlock("no block", "x"), null);
});
