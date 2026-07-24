# Releasing

The exact procedure for cutting a release. Automation lives in
`.github/workflows/release.yml`; this document is the human checklist.

## The tag rule (read this first)

> **The git tag must exactly equal `manifest.json`'s `version`, with NO `v`
> prefix.** Tag `0.1.0`, never `v0.1.0`.

This is required by the Obsidian community directory (BRAT and the directory pull
assets from a release whose tag equals the manifest version). The release
workflow:

- only triggers on tags matching `[0-9]+.[0-9]+.[0-9]+` (and `…-*` pre-releases), and
- fails fast if the tag doesn't match `manifest.json`'s version.

## Steps

1. **Make sure `main` is green.** CI (typecheck, test, build) must pass.

2. **Pick the version** and update the three version files consistently. The
   easiest way is:

   ```bash
   npm version <major.minor.patch> --no-git-tag-version
   ```

   This runs `version-bump.mjs`, which sets `manifest.json`'s `version` and adds a
   `versions.json` entry mapping the new version to the current `minAppVersion`.
   It also updates `package.json`. Confirm `minAppVersion` in `manifest.json` is
   still realistic; bump it if you used a newer Obsidian API.

3. **Update `CHANGELOG.md`.** Rename the `## [Unreleased]` heading to
   `## [x.y.z] - YYYY-MM-DD`, and add a fresh empty `## [Unreleased]` above it.
   The release notes are assembled from this section by
   `scripts/extract-changelog.mjs`.

4. **Commit** the version bump and changelog together:

   ```bash
   git add manifest.json versions.json package.json package-lock.json CHANGELOG.md
   git commit -m "Release x.y.z"
   ```

5. **Tag with no `v` prefix and push:**

   ```bash
   git tag x.y.z
   git push origin main
   git push origin x.y.z
   ```

6. **Watch the Release workflow.** It builds `main.js` and attaches `main.js`,
   `manifest.json`, and `styles.css` to the GitHub Release as **individual**
   binary assets (not a zip). BRAT and the community directory read these.

7. **Verify the release** has all three assets and the notes came from the
   changelog.

## Notes

- `main.js` is **built in CI**, never committed. Do not add it to git.
- Never force-push a tag or a release. If a release is wrong, cut a new patch
  version rather than rewriting history.
- Pre-releases (e.g. `0.2.0-beta.1`) are supported by the workflow trigger and
  are useful for BRAT soak testing.
