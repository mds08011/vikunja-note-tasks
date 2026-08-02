# Vikunja API notes

Every Vikunja endpoint the plugin uses, the v2-vs-v1 situation, auth, and known
quirks. Update this file in the **same commit** as any change to `src/api.ts`.

## Base URL and versioning

- The plugin's **Base URL** setting is the instance root, e.g.
  `https://vikunja.example.com` (no `/api/...` suffix).
- All requests target **`/api/v1`**. `API_BASE` in `src/api.ts` is a single
  constant so migrating a call to `/api/v2` later is a one-line change.

### Why v1 and not v2

Vikunja 2.4.0 introduced a **v2** API (standard REST verbs, OpenAPI 3.1, built on
the Huma framework). However, as of this writing v2 only exposes a small set of
endpoints (admin operations, avatars, task duplication). The CRUD this plugin
needs — **listing projects, creating/updating tasks, labels, and filtered task
listing** — exists **only on v1**. v1 remains fully supported; per the Vikunja
docs it is deprecated in 3.0 and removed in 4.0.

So this plugin is "v2-aware, v1-by-necessity": structured for a trivial per-call
migration as endpoints graduate to v2, but using v1 today because that is where
the endpoints live. See `docs/adr/0003-v2-first-api-strategy.md`.

## Authentication

- Header: `Authorization: Bearer <API token>`.
- Tokens are created in Vikunja under **Settings → API Tokens**. A
  least-privilege token (read/write on tasks, projects, labels) is recommended.
- The plugin also sends `Content-Type: application/json` and `Accept:
  application/json`.

## Endpoints used

| Purpose | Method | Path | Notes |
| --- | --- | --- | --- |
| List projects | `GET` | `/api/v1/projects` | Paginated; the client pages via `page`/`per_page`. |
| List labels | `GET` | `/api/v1/labels` | Paginated. |
| Create task | `PUT` | `/api/v1/projects/{id}/tasks` | Body: `{ title, due_date?, priority? }`. Returns the created task with its `id`. |
| Get task | `GET` | `/api/v1/tasks/{id}` | Used by Refresh to read `done`. |
| Update task (done) | `POST` | `/api/v1/tasks/{id}` | Partial update. Body: `{ done: boolean }`. |
| Add label to task | `PUT` | `/api/v1/tasks/{id}/labels` | Body: `{ label_id: number }`. |
| Create label | `PUT` | `/api/v1/labels` | Body: `{ title }`. Used to auto-create default labels that don't exist yet. |
| List tasks (filtered) | `GET` | `/api/v1/tasks` | Query params below. |

### Task-listing query parameters

- `filter` — a filter expression, URL-encoded.
- `filter_timezone` — IANA timezone (e.g. `America/New_York`) anchoring date math
  like `now/d` to the user's local day.
- `sort_by` / `order_by` — e.g. `sort_by=due_date&order_by=asc`.
- `page` / `per_page` — pagination.

### Filter syntax (as used here)

- Fields are snake_case: `done`, `due_date`, `priority`, `project`, `labels`.
- Operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, combined with `&&` / `||`.
- Date math: anchor `now` plus units `s m h d w M y`; `/d` rounds down to the
  start of the day. Example used for "due today or overdue, open":
  `done = false && due_date <= now/d+1d`.

## Known quirks

- **Task model fields** we rely on: `id`, `title`, `done`, `done_at`, `due_date`,
  `priority`, `project_id`, `identifier`, `index`. Vikunja returns many more.
- **Unset dates** are encoded as the year-0001 zero time
  (`0001-01-01T00:00:00Z`), not null-in-JSON. `render.ts#hasRealDate` treats
  those as "no due date".
- **Dates we send** are RFC3339 with an explicit local offset at midnight, e.g.
  `2026-08-10T00:00:00-07:00` for a `📅 2026-08-10` capture. Vikunja stores UTC
  and renders in the viewer's timezone, so sending a bare `…T00:00:00Z` would
  show the task as due a day early for anyone west of UTC. `due_date` is omitted
  entirely (not sent as null or as the zero time) when a line has no date.
- **Undated tasks in the "today" filter:** whether tasks with no due date are
  returned by `due_date <= now/d+1d` depends on the instance's null-date
  handling. The plugin therefore also filters client-side using the
  **Include undated tasks** setting. This is a known refinement area (see
  ROADMAP 0.3, richer views).
- **Priority** is an integer 0–5 (0 = unset). `render.ts#priorityLabel` maps
  1→Low … 5→DO NOW.
- **Pagination:** list endpoints return an array plus an
  `x-pagination-total-pages` header. The client simply pages until it receives a
  short page, up to a safety cap of 50 pages.
- **Create verb:** Vikunja uses `PUT` (not `POST`) to *create* a task inside a
  project, and `POST` to *update* an existing task. This is intentional in their
  API, and easy to get backwards.
