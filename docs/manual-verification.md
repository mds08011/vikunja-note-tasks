# Manual verification

The unit tests cover the pure logic (`markers.ts`, `render.ts`, `routing.ts`,
`util.ts`). They cannot cover anything that needs a running Obsidian or a live
Vikunja server: modals, the settings tab, `requestUrl`, the metadata cache, and
every timezone-dependent result.

Work through this before tagging a release. It is written to be repeatable —
check the boxes in a scratch copy, not in git.

## Setup

- A Vikunja instance you don't mind writing to (a test instance, or a
  throwaway project set on your real one).
- An API token with read/write on tasks, projects, and labels.
- At least **three** projects, so routing has somewhere to be wrong.
- A scratch vault, or a scratch folder in your vault. Do **not** run this
  against notes you care about: several steps deliberately create tasks.

Note the project IDs as you go — the notices name them, and that's what you're
checking.

## 1. Settings

- [ ] Base URL, token, **Test connection** → notice reports the project count,
      and the **Default project** dropdown fills.
- [ ] Wrong URL → a plain-language error, no stack trace.
- [ ] Wrong token → "rejected the API token", not a generic failure.
- [ ] Reload Obsidian → settings survive, dropdown still populated.

### Folder rules

Enter rules and watch the preview underneath the box.

- [ ] `1204 * = <valid id>` → preview shows `1204 * → <Project name> (#id)`.
- [ ] An id that isn't in the project list → preview warns it isn't in the
      loaded list, but still keeps the rule.
- [ ] `garbage line` (no `=`) → preview lists it as **ignored**, with the line
      number.
- [ ] `Docs = Website` (name, not id) → ignored, reason names the problem.
- [ ] `# a comment` and blank lines → no preview entries, no errors.
- [ ] Rules survive a reload.

## 2. Capture routing

Create these notes. `→` means "run **Create task from selection or line** on a
`- [ ] test` line and read the notice".

| # | Note setup | Expected |
| --- | --- | --- |
| 2.1 | `vikunja-project: <id A>` in frontmatter, note anywhere | task in A, notice says **from this note's frontmatter** |
| 2.2 | No frontmatter, note in a folder matching a rule → B | task in B, notice names the **folder rule** that matched |
| 2.3 | No frontmatter, no matching rule | task in the **default project**, notice says so |
| 2.4 | Frontmatter A *and* a folder rule for B | task in **A** — frontmatter wins |
| 2.5 | Two rules that both match, first → B | task in **B** — first match wins |
| 2.6 | Note at the **vault root**, no frontmatter | falls through to the default project |

Error paths — these must create **nothing**:

- [ ] `vikunja-project: Website` (a name) → notice says it isn't a numeric
      project ID; check Vikunja to confirm no task appeared.
- [ ] `vikunja-project:` (empty, as Obsidian's Properties editor leaves it) →
      **falls through** to folder rules/default. This must *not* error.
- [ ] Default project cleared, no frontmatter, no matching rule → notice asks
      you to set one of the three.

Folder-move check (the reason patterns match names, not paths):

- [ ] With rule `1204 * = <id>`, put a note in `Active/1204 Website/` → routes.
- [ ] Move that folder to `Archive/2024/1204 Website/` → still routes to the
      same project, unchanged.

## 3. Create task in project…

- [ ] Command opens a fuzzy picker listing your projects.
- [ ] Typing filters; `Enter` creates the task in the highlighted project.
- [ ] Notice ends with **(picked)**.
- [ ] On a note whose frontmatter says project A, pick B → task lands in **B**,
      and the note's frontmatter is **unchanged**.
- [ ] `Esc` cancels → no task, no notice, line untouched.
- [ ] On a note with a *malformed* `vikunja-project`, the picker still works —
      an explicit pick overrides a broken key.

Stale-line guard (the picker is the plugin's only async gap):

- [ ] Open the same note in two panes. Run the command in pane 1, and **while
      the picker is open** edit that same line in pane 2. Choose a project.
      → Notice says the line changed and **nothing was created**. Verify in
      Vikunja that no task exists.

Empty-cache path:

- [ ] Clear `cachedProjects` (delete the plugin's `data.json` or use a fresh
      vault), then run the command **without** visiting settings first.
      → The list is fetched on demand; the picker opens populated.

## 4. Labels

Set default labels to `inbox` and use a note with:

```yaml
---
vikunja-labels:
  - website
---
```

- [ ] `- [ ] Plain line` → labels `inbox`, `website`.
- [ ] `- [ ] Tagged line #urgent` → adds `urgent`; the task **title** is
      "Tagged line" with no `#urgent`.
- [ ] `- [ ] Ask #urgent about the pump` → label `urgent`, and the title keeps
      the word mid-sentence: "Ask #urgent about the pump".
- [ ] `- [ ] Review RFI #14` → **no** label from `#14`; title keeps "RFI #14".
- [ ] A label that doesn't exist in Vikunja yet is created, not an error.
- [ ] Default `Website` + line `#website` → **one** label, spelled `Website`.
- [ ] `vikunja-labels: website, q3` (a string, not a list) → both applied.

## 5. Emoji due dates

- [ ] `- [ ] Order rebar 📅 2026-08-10` → due 2026-08-10 in Vikunja, title
      "Order rebar".
- [ ] **Check the date in Vikunja's web UI, in your own timezone.** It must read
      the 10th, not the 9th. This is the one thing unit tests cannot prove.
- [ ] `📆` and `🗓` work the same.
- [ ] `- [ ] Task ⏳ 2026-08-01` → **no** due date, and `⏳ 2026-08-01` is gone
      from the title.
- [ ] `- [ ] Task 📅 2026-02-30` → no due date, and the bad date stays visible in
      the title.
- [ ] `- [ ] Task 🔁 every week` → recurrence text is left **entirely** alone.
- [ ] Turn **Parse Tasks-plugin emoji dates** off → `📅 2026-08-10` stays in the
      title and sets no due date.

## 6. Regression pass (0.1 behaviour)

- [ ] **Push all open tasks** — creates one task per unmarked `- [ ]`, skips
      marked ones, summary names the destination project once.
- [ ] Per-line tags work in a batch push (different tags on different lines).
- [ ] **Mark done** / **Toggle done** — flips in Vikunja and locally.
- [ ] **Refresh statuses** — mirrors remote state; a task deleted in Vikunja is
      *reported* and its line left untouched.
- [ ] **Insert today's tasks** — re-running replaces the block instead of
      duplicating it.
- [ ] **Open in browser** — works with the network off.
- [ ] Running create on an already-captured line says "already captured" — even
      when the note's routing is misconfigured.

## 7. Multi-pane and mobile

- [ ] Same note open in two panes: capture in one, the other updates, no text
      is duplicated or lost.
- [ ] Indented and `*`-bulleted task lines keep their exact indentation and
      bullet after capture.
- [ ] On mobile (or with the mobile emulator): every command appears in the
      palette, the picker is usable on a touch keyboard, and capture works.
      No "Node is not defined" style errors in the console.

## Recording the result

Note the plugin version, Obsidian version, Vikunja version, and your timezone
alongside the run — a date bug that only shows up west of UTC is impossible to
interpret later without them.
