// Prints the CHANGELOG.md section for a given version, for release notes.
// Usage: node scripts/extract-changelog.mjs 0.1.0
// Exits non-zero if the section isn't found, so the workflow can fall back.

import { readFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
	console.error("Usage: node scripts/extract-changelog.mjs <version>");
	process.exit(2);
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
const lines = changelog.split("\n");

// Match "## [0.1.0]" (optionally followed by a date).
const headingRe = new RegExp(
	`^##\\s*\\[${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
);

let start = -1;
for (let i = 0; i < lines.length; i++) {
	if (headingRe.test(lines[i])) {
		start = i + 1;
		break;
	}
}

if (start === -1) {
	console.error(`No changelog section found for ${version}.`);
	process.exit(1);
}

let end = lines.length;
for (let i = start; i < lines.length; i++) {
	if (/^##\s/.test(lines[i])) {
		end = i;
		break;
	}
}

const body = lines.slice(start, end).join("\n").trim();
process.stdout.write(body + "\n");
