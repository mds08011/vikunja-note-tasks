# 2. HTML-comment marker as the source of truth

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

Each captured line needs to remember which Vikunja task it maps to, so the plugin
can (a) avoid creating duplicates and (b) find the task for done/toggle/refresh/
open. The binding has to survive normal Markdown editing, be invisible in reading
view, and not interfere with the visible task text or with other plugins
(Tasks, Dataview).

Candidate approaches: a visible link only (fragile — users edit link text), an
inline field like `[vk:: 123]` (visible, couples us to Dataview syntax), or an
HTML comment.

## Decision

Bind each line with an HTML comment marker: `<!--vk:<id>-->`. It is the **single
source of truth for idempotency** — a line that already contains one is never
created again. A human-readable `[vk](url)` link is added alongside it for
convenience, but detection keys off the marker, not the link.

Regex: `/<!--vk:(\d+)-->/`. The today block uses a matching pair of comment
fences, `<!--vk:today:begin-->` / `<!--vk:today:end-->`.

## Consequences

- Markers are invisible in reading view and ignored by other plugins.
- Idempotency is robust: users can freely edit the visible link or task text.
- The format is greppable and trivial to parse with pure, tested functions.
- If a user deletes the marker, the line becomes "uncaptured" again — acceptable
  and predictable.
- A future setting could make the marker/link format configurable (ROADMAP 0.4);
  the parsing is centralised in `markers.ts` to make that easy.
