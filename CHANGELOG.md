# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

GitHub release notes are assembled from this file.

## [Unreleased]

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
- Repository conventions (`CLAUDE.md`, `AGENTS.md`) and base documentation.

[Unreleased]: https://github.com/USERNAME/vikunja-note-tasks/commits/main
