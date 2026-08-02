# Roadmap

This roadmap is a plan, not a promise. It exists to make the plugin's scope — and
especially its **permanent non-goals** — explicit. The guiding principle never
changes: **every remote action is explicitly user-triggered.**

## 0.1 — Capture, update, and view (released)

- Create a Vikunja task from the selection or current line, rewriting the line
  in place with a visible link and an HTML-comment marker.
- Push all unmarked open tasks in a note.
- Mark done / toggle done for the task on the current line.
- Refresh local checkboxes from Vikunja for every marker in a note.
- Insert a read-only "today & overdue" callout block.
- Open the current line's task in the browser.
- Settings tab with connection test; documented `vikunja-*` frontmatter contract
  (routing ships in 0.2).

## 0.2 — Capture routing and enrichment (built, unreleased)

All five items below are implemented on `main`; see the Unreleased section of
[`CHANGELOG.md`](CHANGELOG.md). They ship when 0.2.0 is tagged.

- Frontmatter project routing per the documented contract:
  `vikunja-project` (authoritative numeric id) > folder-to-project mapping >
  default project.
- Folder-to-project mapping matched by **glob/folder-name pattern** (e.g.
  `**/1204 *`), not full path, so moving a job folder between `Active/` and
  `Archive/` never breaks routing.
- A project-picker variant of the create command (FuzzySuggestModal over the
  cached project list).
- `#tags` on the line become Vikunja labels.
- Optional parsing of Tasks-plugin emoji conventions (e.g. a trailing
  `📅 YYYY-MM-DD` due date) at creation time.

## 0.3 — Richer views

- Filtered "insert tasks" blocks (by project or label) so a project note can
  embed its own open Vikunja tasks.
- A template-friendly "insert tasks" variant for daily-note templates.

## 0.4 — Polish

- A subtle status indicator beside task markers.
- A vault-wide refresh command.
- Configurable marker/link format.

## 1.0

- Ships after a BRAT soak period and acceptance into the community plugin
  directory.

## Permanent non-goals

These are out of scope by design and will not be added:

- Background sync or scheduled/automatic synchronization.
- Real-time watching of Vikunja for changes.
- Task deletion from Obsidian.
- Multi-user conflict resolution / reconciliation.

Kanban **bucket** moves are also out of scope: buckets are per-view constructs,
so this plugin only ever changes a task's done/undone state.
