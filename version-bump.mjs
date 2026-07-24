import { readFileSync, writeFileSync } from "node:fs";

// Keeps manifest.json and versions.json in sync with package.json's version.
// Run automatically by `npm version` (see the "version" script in package.json).
// The release tag must equal this version with NO leading "v" (see RELEASING.md).

const targetVersion = process.env.npm_package_version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`Set version ${targetVersion} (minAppVersion ${minAppVersion}).`);
