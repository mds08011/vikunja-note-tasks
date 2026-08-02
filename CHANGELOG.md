# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

GitHub release notes are assembled from this file.

## [Unreleased]

### Added

- **Capture routing.** The two creating commands now resolve a destination
  project per note: `vikunja-project` frontmatter first, then the first matching
  folder rule, then the default project. Success notices name the project and the
  step that chose it.
- Setting: **Folder rules** — one `pattern = project ID` per line, with a live
  preview that resolves IDs to project names and lists any line it could not
  parse. Patterns without `/` match a folder *name* at any depth, so moving a
  folder between parents doesn't break its routing; patterns with `/` match the
  full folder path.
- `src/routing.ts`, a new Obsidian-free module holding the glob matching and
  resolution order, with unit tests.
- Command: **Create task in project…** — a fuzzy picker over your Vikunja
  projects chooses where this one task goes, overriding frontmatter and folder
  rules without changing the note. Cancelling creates nothing; an empty project
  list is fetched on demand rather than sending you to settings.
- **Tasks-plugin emoji due dates.** A `📅 YYYY-MM-DD` on a captured line becomes
  the task's due date, anchored to local midnight so the day never shifts. Emoji
  date fields (`📅 📆 🗓 ⏳ ⌛ 🛫 ➕ ✅ ❌`) are kept out of the task title, whether
  or not the plugin reads them. New setting **Parse Tasks-plugin emoji dates**
  (on by default) turns the whole behaviour off.
- **Labels from the note and the line.** `vikunja-labels` frontmatter (a YAML
  list or a comma-separated string) applies to every capture in a note, and
  `#tags` on a captured line become labels on that task. Merge order is settings
  defaults → note labels → line tags, de-duplicated ignoring case.

### Fixed

- The project picker no longer risks discarding a choice on Obsidian builds that
  close a modal before reporting the selection.
- "Create task from selection or line" now reports "already captured" on a
  marked line even when the note's routing is misconfigured, matching the order
  the picker variant already used.

### Changed

- A `vikunja-project` frontmatter value that isn't a numeric project ID now stops
  the command with an explanatory notice and creates nothing, instead of being
  ignored. An absent or empty key still falls through to folder rules and the
  default project.
- A **trailing** run of `#tags` is stripped from the task title, since those tags
  now become labels. Tags used mid-sentence stay in the title, and `#` followed
  by digits only (`#1204`, `#14`) is never treated as a tag, so job and RFI
  numbers are untouched.

## [0.1.0] - 2026-07-24

### Added

- Command: **Create task from selection or line** — creates a task in the default
  project (applying default labels, creating any that are missing) and rewrites
  the line in place with a `[vk](url)` link and `<!--vk:id-->` marker. Refuses to
  act on an already-marked line.
- Command: **Push all open tasks in note to Vikunja** — batch-creates a task for
  every unmarked `- [ ]` line, rewrites each, and reports "Created N, skipped M".
- Commands: **Mark Vikunja task done** and **Toggle Vikunja task done/undone** —
  set/flip the done state in Vikunja and mirror it onto the local checkbox.
- Command: **Refresh Vikunja task statuses in note** — mirrors each marked task's
  current done-state onto its local checkbox; deleted (404) tasks are reported,
  never altered or removed from the note.
- Command: **Insert today's Vikunja tasks** — writes a read-only, self-replacing
  callout of tasks due today or overdue (optionally including undated), each with
  due date, priority, and a web-UI link.
- Command: **Open Vikunja task in browser** — opens the current line's task from
  its marker (no API call; works offline).
- Project scaffold: TypeScript + esbuild build, Obsidian sample-plugin layout,
  GPL-3.0-or-later license.
- Pure line/marker logic (`src/markers.ts`) and today-callout rendering
  (`src/render.ts`), fully unit-tested.
- Thin typed Vikunja REST client (`src/api.ts`) with a plain-language error
  taxonomy, documented in `docs/api-notes.md`.
- Settings tab: base URL, API token (stored unencrypted, with an in-UI warning),
  default project dropdown, default labels, include-undated and
  open-after-create toggles, and a **Test connection** button that loads projects.
- `USER_GUIDE.md` with setup steps, the frontmatter contract, mobile toolbar
  setup, and a troubleshooting table.
- GitHub Actions CI (typecheck, test, build) and a tag-triggered release workflow
  that attaches `main.js`, `manifest.json`, and `styles.css` as individual assets.
- `RELEASING.md` (including the no-`v`-prefix tag rule) and `CONTRIBUTING.md`
  (issue-first policy and DCO sign-off).
- Self-contained DCO sign-off check as a GitHub Action (`.github/workflows/dco.yml`),
  no third-party app required.
- Example note templates in `docs/templates/` for two fictional projects
  demonstrating the frontmatter contract and the task-per-line pattern.
- Architecture decision records in `docs/adr/` (explicit-actions-only, marker
  format, v2-aware API strategy, `requestUrl` over `fetch`, GPL-3.0 licensing).
- `docs/SUBMISSION.md` — community-plugins.json entry, id-availability check,
  submission checklist, DCO enforcement, and the PR procedure.
- Per-command walkthroughs with before/after examples in `USER_GUIDE.md`.
- README illustrations (`docs/media/*.svg`) of the capture transform and the
  today callout.
- Repository conventions (`CLAUDE.md`, `AGENTS.md`) and base documentation.

[Unreleased]: https://github.com/mds08011/vikunja-note-tasks/compare/0.1.0...HEAD
[0.1.0]: https://github.com/mds08011/vikunja-note-tasks/releases/tag/0.1.0
