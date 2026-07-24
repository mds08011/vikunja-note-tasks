# 1. Explicit actions only — no background sync

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

Integrations between a note app and a task manager usually reach for
bidirectional sync: watch both sides, reconcile differences, resolve conflicts.
That is powerful but also the source of most of their bugs — silent overwrites,
duplicate tasks, surprising deletions, and behaviour the user cannot predict or
audit. The reference plugin in this space
([Heiss/obsidian-vikunja-plugin](https://github.com/Heiss/obsidian-vikunja-plugin))
implements full sync and carries exactly that complexity.

We want a tool a user can fully reason about, that never touches their notes or
their server unless they asked it to in that moment.

## Decision

Every remote action is **explicitly user-triggered** via a command. The plugin
has no background polling, no scheduled sync, no reconciliation engine, and no
watching of Vikunja for remote changes. These are **permanent non-goals**, not
unbuilt features. The single command that treats Vikunja as authoritative
(Refresh) only ever updates local checkboxes and never edits or deletes note text.

## Consequences

- The plugin is predictable and auditable: nothing happens without a command.
- No conflict resolution is needed, because there is no automatic two-way state.
- The user is responsible for running commands when they want data to move; the
  UX and docs lean into that (concise Notices, clear command names).
- Some conveniences (live status, auto-updating embeds) are out of scope by
  design; richer *explicit* views are the growth path (see ROADMAP 0.3).
