import { strict as assert } from "node:assert";
import { test } from "node:test";
import { headingsForLines, headingText } from "../src/headings";

test("a line reports the nearest heading above it", () => {
	const lines = [
		"# Drive home",
		"",
		"## 6100 El Toro",
		"- [ ] Chase the coating submittal",
		"## Pursuits",
		"- [ ] Send the Sweetwater RFI",
	];
	const headings = headingsForLines(lines);

	assert.equal(headings[3], "6100 El Toro");
	assert.equal(headings[5], "Pursuits");
});

test("lines before the first heading have none", () => {
	const headings = headingsForLines(["- [ ] Order rebar", "# Later"]);

	assert.equal(headings[0], null);
});

test("a heading line reports the section it is in, not itself", () => {
	// A heading is never a task line, so this only matters for consistency —
	// but reporting itself would make a rule look like it matched one line early.
	const headings = headingsForLines(["## 6100", "- [ ] Thing"]);

	assert.equal(headings[0], null);
	assert.equal(headings[1], "6100");
});

test("a deeper heading takes over from a shallower one", () => {
	const lines = ["# Work", "## 6100 El Toro", "- [ ] Thing"];

	assert.equal(headingsForLines(lines)[2], "6100 El Toro");
});

test("headings inside a fenced code block are ignored", () => {
	// The failure this prevents is invisible in the rendered note: a quoted
	// shell comment would silently re-route every task below it.
	const lines = [
		"## 6100 El Toro",
		"```bash",
		"# Pursuits",
		"rebuild --now",
		"```",
		"- [ ] Still an El Toro task",
	];

	assert.equal(headingsForLines(lines)[5], "6100 El Toro");
});

test("a tilde fence is not closed by a backtick fence", () => {
	const lines = ["## A", "~~~", "```", "# B", "~~~", "- [ ] Task"];

	assert.equal(headingsForLines(lines)[5], "A");
});

test("a hash with no space is not a heading", () => {
	// "#6100" is a tag in Obsidian, not a heading.
	const headings = headingsForLines(["## Real", "#6100", "- [ ] Task"]);

	assert.equal(headings[2], "Real");
});

test("headingText strips emphasis, code, links and trailing hashes", () => {
	assert.equal(headingText("**6100 El Toro**"), "6100 El Toro");
	assert.equal(headingText("`6100` El Toro"), "6100 El Toro");
	assert.equal(headingText("*Pursuits*"), "Pursuits");
	assert.equal(headingText("[[6100 El Toro]]"), "6100 El Toro");
	assert.equal(headingText("[[6100 El Toro|El Toro]]"), "El Toro");
	assert.equal(headingText("[El Toro](https://example.com)"), "El Toro");
	assert.equal(headingText("6100 El Toro ##"), "6100 El Toro");
});
