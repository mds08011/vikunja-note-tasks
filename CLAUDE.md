# Repository conventions

Guidance for any agent (or human) working in this repository. `AGENTS.md` points
here; this file is canonical.

## What this project is

Vikunja Note Tasks is an **unofficial** Obsidian community plugin: a thin,
explicit integration between Obsidian notes and a user's own self-hosted Vikunja
server. It is built to public-release quality for eventual submission to the
Obsidian community plugin directory. License: **GPL-3.0-or-later**.

## The one boundary that shapes everything: explicit actions only

Every remote action is explicitly user-triggered. There is **no** background
polling, **no** automatic sync, and **no** reconciliation engine — these are
permanent non-goals, not unbuilt features (see `ROADMAP.md`). Explicit
create/update/read commands are the entire surface. Do not add anything that
touches the network without a direct user command behind it.

## Working rules

- **Docs travel with code.** Every user-visible change updates the relevant doc
  in the *same commit*: `CHANGELOG.md` always; plus `README.md`, `USER_GUIDE.md`,
  `docs/api-notes.md`, or `docs/DEVELOPER_GUIDE.md` as applicable.
- **Green before commit.** `npm run typecheck`, `npm test`, and `npm run build`
  must all pass before every commit.
- **Surgical editor edits.** Commands modify only their exact target lines,
  preserve indentation and surrounding text, and must behave correctly when a
  file is open in multiple panes.
- **Mobile-safe.** No Node or Electron APIs anywhere in `src/`. All HTTP goes
  through Obsidian's `requestUrl` (never `fetch`/`axios`) to avoid mobile CORS.
- **Pure logic stays pure.** `src/markers.ts` and `src/render.ts` must not import
  `obsidian`; that keeps them unit-testable without mocks.

## Commit and git rules

- Concise, professional, imperative subject lines (e.g. "Add refresh command").
- **No** co-author trailers, attribution footers, or tooling references in commit
  messages, code comments, or user-facing docs. (This file and `AGENTS.md` are
  repo-convention files and are exempt from that rule.)
- **Never force-push.** Ask before any destructive git operation.
- Release tags match `manifest.json`'s version with **no** `v` prefix
  (tag `0.1.0`, not `v0.1.0`). See `RELEASING.md`.

## Build and test

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test over tests/*.ts via tsx
npm run build       # typecheck + esbuild production bundle -> main.js
```

## Where things live

See `docs/DEVELOPER_GUIDE.md` for the full module map, the marker-format spec,
the title-extraction and line-rewrite invariants, and how to add a command.
`docs/api-notes.md` documents every Vikunja endpoint used.
