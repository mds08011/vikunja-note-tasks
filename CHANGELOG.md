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
- Repository conventions (`CLAUDE.md`, `AGENTS.md`) and base documentation.

[Unreleased]: https://github.com/USERNAME/vikunja-note-tasks/commits/main
