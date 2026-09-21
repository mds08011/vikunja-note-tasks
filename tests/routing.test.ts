import { test } from "node:test";
import assert from "node:assert/strict";
import {
	matchesHeadingPattern,
	folderPathOf,
	matchesFolderPattern,
	parseFolderMappings,
	parseProjectId,
	resolveProject,
} from "../src/routing.ts";

test("folderPathOf strips the filename", () => {
	assert.equal(folderPathOf("Active/1204 Website/meeting.md"), "Active/1204 Website");
	assert.equal(folderPathOf("note.md"), "");
	assert.equal(folderPathOf("/Active/note.md"), "Active");
	assert.equal(folderPathOf("A/B/C/note.md"), "A/B/C");
});

test("a pattern without a slash matches any folder name at any depth", () => {
	assert.ok(matchesFolderPattern("1204 *", "Active/1204 Website/Notes"));
	assert.ok(matchesFolderPattern("1204 *", "Archive/1204 Website"));
	assert.ok(matchesFolderPattern("1204 *", "1204 Website"));
	assert.ok(!matchesFolderPattern("1204 *", "Active/1205 Other"));
	// The whole segment must match, not just a prefix of it.
	assert.ok(!matchesFolderPattern("Web", "Active/Website"));
});

test("moving a job folder between parents does not change the match", () => {
	const pattern = "1204 *";
	assert.equal(
		matchesFolderPattern(pattern, folderPathOf("Active/1204 Website/a.md")),
		matchesFolderPattern(pattern, folderPathOf("Archive/2024/1204 Website/a.md")),
	);
});

test("a pattern with a slash matches the whole folder path", () => {
	assert.ok(matchesFolderPattern("Clients/Acme", "Clients/Acme"));
	assert.ok(!matchesFolderPattern("Clients/Acme", "Archive/Clients/Acme"));
	assert.ok(matchesFolderPattern("**/Clients/Acme", "Archive/Clients/Acme"));
	// A leading **/ is optional, so the same rule still matches at the root.
	assert.ok(matchesFolderPattern("**/Clients/Acme", "Clients/Acme"));
});

test("a trailing /** covers the folder itself and everything under it", () => {
	assert.ok(matchesFolderPattern("Clients/**", "Clients"));
	assert.ok(matchesFolderPattern("Clients/**", "Clients/Acme/Notes"));
	assert.ok(!matchesFolderPattern("Clients/**", "Archive"));
});

test("* does not cross a path separator", () => {
	assert.ok(matchesFolderPattern("Clients/*", "Clients/Acme"));
	assert.ok(!matchesFolderPattern("Clients/*", "Clients/Acme/Notes"));
	assert.ok(matchesFolderPattern("Clients/**", "Clients/Acme/Notes"));
});

test("matching is case-insensitive and root notes match nothing", () => {
	assert.ok(matchesFolderPattern("clients/**", "Clients/Acme"));
	assert.ok(matchesFolderPattern("WEBSITE", "website"));
	assert.ok(!matchesFolderPattern("1204 *", ""));
	assert.ok(!matchesFolderPattern("", "Anything"));
});

test("glob metacharacters in a folder name are matched literally", () => {
	assert.ok(matchesFolderPattern("Q3 (draft)", "Q3 (draft)"));
	assert.ok(!matchesFolderPattern("Q3 (draft)", "Q3 draft"));
	assert.ok(matchesFolderPattern("a?c", "abc"));
	assert.ok(!matchesFolderPattern("a?c", "a/c"));
});

test("parseProjectId accepts positive integers only", () => {
	assert.equal(parseProjectId(7), 7);
	assert.equal(parseProjectId("7"), 7);
	assert.equal(parseProjectId(" 7 "), 7);
	assert.equal(parseProjectId(0), null);
	assert.equal(parseProjectId(-3), null);
	assert.equal(parseProjectId(1.5), null);
	assert.equal(parseProjectId("Website"), null);
	assert.equal(parseProjectId("7a"), null);
	assert.equal(parseProjectId(true), null);
	assert.equal(parseProjectId(undefined), null);
});

test("parseFolderMappings reads rules and skips blanks and comments", () => {
	const { mappings, errors } = parseFolderMappings(
		["# routing", "", "1204 * = 7", "Clients/Acme/** = 12  ", "   "].join("\n"),
	);
	assert.deepEqual(mappings, [
		{ pattern: "1204 *", projectId: 7 },
		{ pattern: "Clients/Acme/**", projectId: 12 },
	]);
	assert.deepEqual(errors, []);
});

test("parseFolderMappings reports bad lines instead of dropping them silently", () => {
	const { mappings, errors } = parseFolderMappings(
		["1204 * = 7", "no separator here", "= 9", "Docs = Website"].join("\n"),
	);
	assert.deepEqual(mappings, [{ pattern: "1204 *", projectId: 7 }]);
	assert.equal(errors.length, 3);
	assert.deepEqual(
		errors.map((e) => e.line),
		[2, 3, 4],
	);
	assert.match(errors[2].reason, /not a numeric project ID/);
});

const RULES = [
	{ pattern: "1204 *", projectId: 7 },
	{ pattern: "Clients/**", projectId: 12 },
];

test("frontmatter wins over folder rules and the default", () => {
	const outcome = resolveProject({
		frontmatterValue: 3,
		folderPath: "Active/1204 Website",
		mappings: RULES,
		defaultProjectId: 99,
	});
	assert.deepEqual(outcome, { ok: true, projectId: 3, source: "frontmatter" });
});

test("a folder rule wins over the default, and the first match wins", () => {
	const outcome = resolveProject({
		frontmatterValue: undefined,
		folderPath: "Clients/1204 Website",
		mappings: RULES,
		defaultProjectId: 99,
	});
	assert.deepEqual(outcome, {
		ok: true,
		projectId: 7,
		source: "folder",
		pattern: "1204 *",
	});
});

test("the default project is the last resort", () => {
	const outcome = resolveProject({
		frontmatterValue: undefined,
		folderPath: "Journal/2026",
		mappings: RULES,
		defaultProjectId: 99,
	});
	assert.deepEqual(outcome, { ok: true, projectId: 99, source: "default" });
});

test("an empty or absent frontmatter key falls through rather than erroring", () => {
	for (const value of [undefined, null, "", "   "]) {
		const outcome = resolveProject({
			frontmatterValue: value,
			folderPath: "Journal",
			mappings: [],
			defaultProjectId: 99,
		});
		assert.deepEqual(outcome, { ok: true, projectId: 99, source: "default" });
	}
});

test("a non-numeric frontmatter value is an error, never a silent fallback", () => {
	const outcome = resolveProject({
		frontmatterValue: "Website",
		folderPath: "Active/1204 Website",
		mappings: RULES,
		defaultProjectId: 99,
	});
	assert.deepEqual(outcome, {
		ok: false,
		reason: "invalid-frontmatter",
		raw: "Website",
	});
});

test("no frontmatter, no matching rule, and no default is unrouted", () => {
	const outcome = resolveProject({
		frontmatterValue: undefined,
		folderPath: "Journal",
		mappings: RULES,
		defaultProjectId: null,
	});
	assert.deepEqual(outcome, { ok: false, reason: "unrouted" });
});

// --- Heading rules -------------------------------------------------------
//
// The case these exist for: one dictated capture, grouped under a heading per
// job, pushed in a single command instead of split by hand at paste time.

const headingRules = [
	{ pattern: "6100 *", projectId: 18299 },
	{ pattern: "*Pursuit*", projectId: 28631 },
	{ pattern: "Personal", projectId: 18294 },
];

test("a heading rule routes a line inside that section", () => {
	const outcome = resolveProject({
		frontmatterValue: undefined,
		folderPath: "Work/General",
		mappings: [],
		defaultProjectId: 1,
		heading: "6100 El Toro WWTP",
		headingMappings: headingRules,
	});

	assert.equal(outcome.ok, true);
	if (!outcome.ok) return;
	assert.equal(outcome.projectId, 18299);
	assert.equal(outcome.source, "heading");
	assert.equal(outcome.pattern, "6100 *");
	assert.equal(outcome.heading, "6100 El Toro WWTP");
});

test("a heading rule beats frontmatter, because it is the narrower statement", () => {
	const outcome = resolveProject({
		frontmatterValue: 18294,
		folderPath: "Personal",
		mappings: [],
		defaultProjectId: 1,
		heading: "Pursuits and bids",
		headingMappings: headingRules,
	});

	assert.equal(outcome.ok, true);
	if (!outcome.ok) return;
	assert.equal(outcome.projectId, 28631);
	assert.equal(outcome.source, "heading");
});

test("frontmatter still wins where no heading rule matches", () => {
	const outcome = resolveProject({
		frontmatterValue: 18294,
		folderPath: "Personal",
		mappings: [],
		defaultProjectId: 1,
		heading: "Notes",
		headingMappings: headingRules,
	});

	assert.equal(outcome.ok, true);
	if (!outcome.ok) return;
	assert.equal(outcome.projectId, 18294);
	assert.equal(outcome.source, "frontmatter");
});

test("an unusable frontmatter value fails even when a heading rule matched", () => {
	// The note asked for a destination that does not exist. Routing around the
	// typo would put the task somewhere nobody is looking for it.
	const outcome = resolveProject({
		frontmatterValue: "El Toro",
		folderPath: "Work",
		mappings: [],
		defaultProjectId: 1,
		heading: "6100 El Toro",
		headingMappings: headingRules,
	});

	assert.equal(outcome.ok, false);
	if (outcome.ok) return;
	assert.equal(outcome.reason, "invalid-frontmatter");
});

test("a note with no heading rules behaves exactly as before", () => {
	const outcome = resolveProject({
		frontmatterValue: undefined,
		folderPath: "Work/Projects/6100 El Toro",
		mappings: [{ pattern: "6100 *", projectId: 18299 }],
		defaultProjectId: 1,
		heading: "Some heading",
		headingMappings: [],
	});

	assert.equal(outcome.ok, true);
	if (!outcome.ok) return;
	assert.equal(outcome.source, "folder");
});

test("a line above the first heading falls through to the note's own routing", () => {
	const outcome = resolveProject({
		frontmatterValue: 18299,
		folderPath: "Work",
		mappings: [],
		defaultProjectId: 1,
		heading: null,
		headingMappings: headingRules,
	});

	assert.equal(outcome.ok, true);
	if (!outcome.ok) return;
	assert.equal(outcome.source, "frontmatter");
});

test("heading patterns match the whole heading, case-insensitively", () => {
	assert.equal(matchesHeadingPattern("6100 *", "6100 El Toro"), true);
	assert.equal(matchesHeadingPattern("6100 *", "Job 6100 El Toro"), false);
	assert.equal(matchesHeadingPattern("*pursuit*", "Pursuits and bids"), true);
	assert.equal(matchesHeadingPattern("personal", "Personal"), true);
	assert.equal(matchesHeadingPattern("6100 *", ""), false);
	assert.equal(matchesHeadingPattern("", "6100 El Toro"), false);
});
