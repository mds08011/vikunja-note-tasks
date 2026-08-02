# Developer guide

Everything a contributor needs to understand the codebase. Pair this with
[`CLAUDE.md`](../CLAUDE.md) (repo conventions) and
[`api-notes.md`](api-notes.md) (the Vikunja endpoints).

## Module map

| Module | Obsidian? | Responsibility |
| --- | --- | --- |
| `src/types.ts` | no | Shared Vikunja/data interfaces. |
| `src/markers.ts` | no | Pure line/marker/block string logic. **Unit-tested.** |
| `src/render.ts` | no | Pure rendering of the read-only "today" callout. **Unit-tested.** |
| `src/routing.ts` | no | Pure capture routing: folder globs and the resolution order. **Unit-tested.** |
| `src/api.ts` | `requestUrl` only | Thin typed Vikunja REST client + typed error class. |
| `src/pickers.ts` | yes | Fuzzy project picker modal, promise-wrapped. |
| `src/settings.ts` | yes | Settings tab UI and connection test. |
| `src/main.ts` | yes | Plugin entry point; wires commands to logic. |

**Invariant:** `types.ts`, `markers.ts`, `render.ts`, and `routing.ts` must never
import `obsidian`. That keeps them runnable under `node --test` with no mocking. If you
need Obsidian, the code belongs in `main.ts` or `settings.ts`.

## Marker format spec

A captured task line carries two artifacts appended to it:

```
- [ ] Order rebar [vk](https://vikunja.example.com/tasks/123) <!--vk:123-->
                  └── visible link ──┘ └──── marker ────┘
```

- **Marker:** `<!--vk:<id>-->` where `<id>` is the numeric Vikunja task id. The
  regex is `MARKER_RE = /<!--vk:(\d+)-->/`.
- The **marker is the single source of truth for idempotency.** A line that
  already contains a marker is never created again. The visible link is for
  humans and is not required to be present for detection.
- **Today block:** the read-only callout is fenced by `<!--vk:today:begin-->` and
  `<!--vk:today:end-->`. Re-running "Insert today's Vikunja tasks" replaces the
  content between those fences instead of duplicating it.

## Title-extraction invariants (`extractTitle`)

Given a line, the Vikunja task title is the line **minus**:

1. checkbox / list syntax (`- [ ] `, `* `, indentation),
2. any existing `[vk](url)` link,
3. any `<!--vk:id-->` marker,
4. any trailing `→ [[Wikilink]]` (or `-> [[Wikilink]]`) artifacts pointer,
5. any **Tasks-plugin emoji date field** (`📅 ⏳ 🛫 ➕ ✅ ❌` + `YYYY-MM-DD`), when
   `stripEmojiDates` is on — the second parameter, wired to the
   **Parse Tasks-plugin emoji dates** setting,
6. any **trailing run of `#tags`** (those become labels instead).

Emoji dates are stripped *before* tags so a line ending either way round
(`text #tag 📅 2026-08-10` or `text 📅 2026-08-10 #tag`) yields a clean title.

All other text is kept verbatim; only whitespace left behind by the removals is
collapsed to single spaces and trimmed. Mid-line brackets, numbers, and
punctuation are preserved (they are part of the title).

## Tag and label invariants (`extractTags`)

- A tag must start the line or follow whitespace, and its body must contain at
  least one non-digit. That is what keeps `# Heading` (space after the hash),
  a URL fragment (`…/page#section`, no preceding space), and a bare job or RFI
  number (`#1204`, `#14`) from becoming labels. Nested tags (`#site/north`) pass
  through whole.
- **Tags anywhere on the line become labels; only *trailing* tags leave the
  title.** A tag used mid-sentence ("Ask #urgent about the pump") is prose, and
  deleting it would mangle the title.
- Label names are assembled per line as settings defaults → note
  `vikunja-labels` → line tags, then de-duplicated case-insensitively, so the
  earliest source decides the spelling that gets created.
- `LabelResolver` in `commands.ts` fetches the remote label list at most **once
  per command** and caches labels it creates. Per-line tags therefore do not
  turn a batch push into one `listLabels` call per line.

## Line-rewrite invariants (`rewriteLineWithTask`)

- Indentation and bullet/checkbox syntax are preserved byte-for-byte.
- The `[vk](url) <!--vk:id-->` pair is appended after the task text.
- A trailing `→ [[Wikilink]]` pointer stays at the **very end** of the line, so
  the rewrite reads `… text [vk](url) <!--vk:id--> → [[Note]]`.
- The function is surgical on one line; the *caller* guarantees it is only run on
  marker-free lines. Editor writes replace only the exact target line(s).

## Capture-routing invariants (`routing.ts`)

`resolveProject` returns a discriminated `RouteOutcome` rather than throwing:
the module is Obsidian-free, and `api.ts` (which owns `VikunjaApiError`) imports
`requestUrl`. `commands.ts` maps a failed outcome onto a `config` error.

- **Order:** an explicit pick from "Create task in project…" → frontmatter
  `vikunja-project` → first matching folder rule → default project. First answer
  wins. A pick is passed to `contextForNote` as `pickedProjectId` and short-
  circuits the rules entirely; it never suppresses note labels, because choosing
  a project is not a statement about labels.
- **A malformed `vikunja-project` is an error, not a fallback.** Falling through
  to the default project would create the task somewhere the note explicitly
  disclaimed. An *absent or empty* key is "no opinion" and falls through normally
  — Obsidian's Properties editor leaves empty keys behind routinely.
- **Routing resolves once per command invocation**, before any network call, so a
  batch push cannot create tasks in two different projects or fail halfway on a
  routing problem.
- **A modal is an async gap.** `resolveCaptureTarget` runs *before* the picker
  opens (so the modal never appears when there is nothing to capture), and the
  target line is compared against its captured text *after* the picker closes.
  If it changed — edited in another pane, or the note reorganised — the command
  reports that and creates nothing, rather than rewriting a line it never read.
- **Glob semantics:** a pattern without `/` matches any single folder *name* at
  any depth (so a folder can move between parents without breaking routing); a
  pattern with `/` matches the full folder path. `*` stays within a segment, `**`
  crosses segments, a leading `**/` and a trailing `/**` are both optional
  matches. Case-insensitive. Unparseable rule lines are dropped from matching and
  reported to the settings UI by `parseFolderMappings`.

## Due-date invariants (`extractDueDate`, `dueDateToRfc3339`)

- **Only `📅 📆 🗓` set a due date.** The other emoji date fields are stripped
  from the title but never read: Vikunja has no field for a "start" or
  "scheduled" date, and inventing a mapping would lose information silently.
- **`🔁` recurrence is never touched** — unbounded free-text value, so there is no
  safe strip.
- **An impossible date (`2026-02-30`) parses to null** and stays in the title.
  `isRealYmd` does the leap-year arithmetic; we never coerce a bad date.
- **Due dates are sent as local midnight with an explicit offset**
  (`2026-08-10T00:00:00-07:00`), not `…Z`. A bare Z would land the task on the
  previous day for every user west of UTC. `dueDateToRfc3339` takes the offset as
  a parameter so it stays pure and testable; `dueDateIsoFor` in `commands.ts`
  computes it from *that date* (`new Date(y, m-1, d)`), not from "now", so a due
  date on the far side of a DST change gets the right offset.

## Done-state mapping

- Checkbox `[x]` / `[X]` ↔ Vikunja `task.done = true`.
- Checkbox `[ ]` ↔ `task.done = false`.
- `getCheckboxState` returns `null` for non-checkbox lines (left untouched).
- `setCheckboxState` changes only the single state character.

## How to add a command

1. If the command needs new pure logic, add it to `markers.ts`/`render.ts` and a
   test in `tests/`. Keep it Obsidian-free.
2. If it needs a new endpoint, add a typed method to `api.ts` and document the
   endpoint in [`api-notes.md`](api-notes.md) **in the same commit**.
3. Register the command in `main.ts` via `this.addCommand({ id, name, editorCallback })`.
   Use `editorCallback`/`editorCheckCallback` for cursor-based commands.
4. Give clear, distinct `Notice`s for success and for each failure class
   (see the error taxonomy in `api.ts`).
5. Add no default hotkey (per Obsidian guidelines).
6. Update `CHANGELOG.md`, and `README.md`/`USER_GUIDE.md` if user-visible.

## Tests

Pure logic is tested with Node's built-in test runner via `tsx`:

```bash
npm test        # node --import tsx --test tests/*.test.ts
```

No test makes a live API call. I/O-bearing modules (`api.ts`) are kept thin so
the risky logic lives in the pure, tested modules.

What that leaves untested by construction: modals (`pickers.ts`), the settings
tab, `requestUrl` itself, the metadata cache, and every timezone-dependent
result. [`manual-verification.md`](manual-verification.md) is the checklist that
covers those before a release.
