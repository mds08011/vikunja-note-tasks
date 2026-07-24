# Directory submission

Everything needed to submit Vikunja Note Tasks to the Obsidian community plugin
directory. **Do not open the PR from automation** — this is a human step, done
when you're ready.

> **Fill in the placeholder first.** Replace `USERNAME` everywhere with the actual
> GitHub owner of the repository (this file, `README.md`, and `CHANGELOG.md` use
> it), and confirm the **author** name below is how you want to be credited.

## community-plugins.json entry

Add this object to the end of the array in
[`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases)
→ `community-plugins.json`:

```json
{
	"id": "vikunja-note-tasks",
	"name": "Vikunja Note Tasks",
	"author": "Malcolm Smith",
	"description": "Create, update, and view tasks on your own self-hosted Vikunja server through explicit, user-triggered commands. Unofficial integration with no background sync, no reconciliation, and no telemetry.",
	"repo": "USERNAME/vikunja-note-tasks"
}
```

- `description` matches `manifest.json` (197 chars, ≤ 250, action-first, ends with
  a period, includes "unofficial", no emoji).

## ID availability (verified)

Checked against `community-plugins.json` (6,009 plugins at time of writing):

- `vikunja-note-tasks` — **not taken.** ✅
- The only existing Vikunja entry is `vikunja-sync` (`heiss/obsidian-vikunja-plugin`),
  a different plugin with a different id.

Re-run this check right before submitting (the list changes):

```bash
curl -s https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json \
  | grep -n '"vikunja-note-tasks"'
```

An empty result means the id is still free.

## Submission checklist

### Manifest and repo basics

- [x] `manifest.json` at repo root with `id`, `name`, `version`, `minAppVersion`,
      `description`, `author`, `isDesktopOnly`.
- [x] `id` is unique, lowercase-kebab, and does **not** start with `obsidian`.
- [x] `name` does not contain "Obsidian" and does not end with "Plugin".
- [x] `description` ≤ 250 chars, starts with an action verb, ends with a period,
      no emoji, and includes "unofficial".
- [x] `isDesktopOnly: false` and no Node/Electron APIs (mobile compatible).
- [x] `versions.json` maps plugin version → `minAppVersion`.
- [x] `LICENSE` present (GPL-3.0-or-later), declared in `package.json`.
- [x] `README.md` describes what it does, how to use it, and its unofficial status.

### Release

- [ ] A GitHub **Release** exists whose **tag equals `manifest.json`'s version
      with no `v` prefix** (e.g. `0.1.0`). See [`RELEASING.md`](../RELEASING.md).
- [ ] The release has `main.js`, `manifest.json`, and `styles.css` attached as
      **individual** assets (the Release workflow does this automatically).
- [x] `main.js` is **not** committed to the repo (built in CI).

### Developer policies

- [x] **Network use disclosed:** the README's "Network-use disclosure" section
      states the plugin connects only to the user's configured Vikunja server.
- [x] **No telemetry / ads / analytics.** No third-party endpoints.
- [x] Stores the API token in plugin data with an **in-UI warning** and a
      recommendation to use a least-privilege token.
- [x] No obfuscated code; all HTTP via `requestUrl`.
- [x] Styling via CSS classes in `styles.css` (namespaced `vnt-`), not inline
      styles injected from JS.
- [ ] Add real screenshots/GIF to the README (replace the `docs/media/*`
      placeholders) before submitting.

### DCO enforcement (maintainer step)

- [ ] Install the **DCO GitHub App** on the repository:
      <https://github.com/apps/dco>. It enforces `Signed-off-by` on external PRs,
      matching the policy in [`CONTRIBUTING.md`](../CONTRIBUTING.md). This is a
      manual, one-time step.

### fundingUrl (optional, later)

`fundingUrl` is intentionally omitted from `manifest.json` for now. To add it
later, insert e.g.:

```json
"fundingUrl": "https://github.com/sponsors/USERNAME"
```

(or a `{ "Buy me a coffee": "https://…" }` object for multiple links).

## PR steps against obsidianmd/obsidian-releases

1. Ensure the tagged **Release** exists with the three assets (above).
2. Re-verify the id is still free (command above).
3. Fork `obsidianmd/obsidian-releases`.
4. Add the JSON entry above to the **end** of `community-plugins.json`. Keep valid
   JSON (comma placement) and the repo's formatting.
5. Commit with DCO sign-off (`git commit -s`) and open a PR titled
   `Add Vikunja Note Tasks`.
6. The Obsidian bot runs automated validation (manifest, release assets, id, etc.).
   Fix anything it flags and push updates to the same PR.
7. Wait for a maintainer review. Respond to feedback; do not force-push shared
   branches.

## After acceptance

- Update the README install section to say the plugin is available in
  **Settings → Community plugins → Browse**.
- Continue using BRAT for pre-release soak testing of new versions.
