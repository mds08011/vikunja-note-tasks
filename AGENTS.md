# AGENTS.md

Repository conventions for AI agents live in [`CLAUDE.md`](CLAUDE.md), which is
canonical. The short version:

- **Explicit actions only** — no background sync, polling, or reconciliation; ever.
- **Docs travel with code** — update `CHANGELOG.md` (and any relevant guide) in the
  same commit as the change.
- **Green before commit** — `npm run typecheck`, `npm test`, `npm run build` all pass.
- **Mobile-safe** — no Node/Electron APIs; all HTTP via Obsidian's `requestUrl`.
- **Commits** — imperative subject lines, no attribution/tooling footers, never force-push.
- **Release tags** — match `manifest.json` version with no `v` prefix.

Read [`CLAUDE.md`](CLAUDE.md) in full before making changes.
