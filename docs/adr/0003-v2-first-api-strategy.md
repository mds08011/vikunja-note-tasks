# 3. v2-aware, v1-by-necessity API strategy

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

Vikunja 2.4.0 introduced a **v2** API (standard REST verbs, OpenAPI 3.1, built on
the Huma framework) and signalled v1's eventual deprecation (removed in 4.0). We
want to target the modern API where practical and not paint ourselves into a
corner.

However, on inspection the v2 surface is currently small: admin operations,
avatars, task duplication. The endpoints this plugin actually needs — listing
projects, creating and updating tasks, labels, and filtered task listing — exist
**only on v1** today. (See `docs/api-notes.md` for the endpoint inventory.)

## Decision

Be **v2-aware but v1-by-necessity.** Every call targets `/api/v1` because that is
where the endpoints live, but the version segment is a single constant
(`API_BASE`) in `src/api.ts`, and each method is a thin wrapper. Migrating an
individual call to `/api/v2` as it graduates upstream is a one-line change per
method, not a rewrite.

## Consequences

- The plugin works against real, current Vikunja instances today.
- Migration cost is minimised and localised to one module.
- We must track which endpoints move to v2 over time and update `api-notes.md`
  when we migrate a call.
- We explicitly do **not** adopt v1 features that v2 is likely to reshape in ways
  that would deepen coupling.
