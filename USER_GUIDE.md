# User guide

A non-developer walkthrough of Vikunja Note Tasks: setup, each command, the
frontmatter contract, mobile use, and troubleshooting.

> **Unofficial:** this plugin is not affiliated with or endorsed by Vikunja.

## The idea: a task is a line until it accrues artifacts

Keep your task *as a line in your note*. That line stays the task of record. When
a task grows enough that it needs supporting material — meeting notes, a photo, a
spec, a decision — give it a wikilinked note for those **artifacts**, and leave a
pointer on the line:

```md
- [ ] Finalise structural drawings → [[Structural drawings]]
```

The line is still the task; the linked note just holds what accreted around it.
When you capture the line to Vikunja, the pointer stays put and the title sent to
Vikunja is just "Finalise structural drawings".

## Before you start

### 1. Get a Vikunja API token

1. Log in to your Vikunja instance in a browser.
2. Go to **Settings → API Tokens**.
3. Create a token. Give it the **least privilege** you need — read and write on
   **tasks**, **projects**, and **labels** is enough for this plugin.
4. Copy the token now; Vikunja won't show it again.

### 2. Find your Base URL

It's the root of your instance, e.g. `https://vikunja.example.com` — **without**
any `/api/...` suffix. The plugin adds the API path itself.

### 3. (Optional) Find a project ID

Open a project in the Vikunja web UI and look at the URL:
`…/projects/7/…` → the project ID is `7`. You'll usually pick the project from a
dropdown instead, but IDs are what the [frontmatter contract](#frontmatter-contract)
and [folder rules](#folder-rules) route on.

## Settings

Open **Settings → Community plugins → Vikunja Note Tasks**.

| Setting | What to enter |
| --- | --- |
| **Base URL** | `https://vikunja.example.com` |
| **API token** | The token from step 1. Stored **unencrypted** in the vault's plugin data — use a least-privilege token. |
| **Default project** | Click **Test connection** first to load the list, then pick one. Used when nothing more specific routes the note. |
| **Folder rules** | Optional. One `pattern = project ID` per line, e.g. `1204 * = 7`. See [capture routing](#capture-routing). |
| **Default labels** | Comma-separated, e.g. `inbox, from-obsidian`. Applied to every created task; missing labels are created for you. |
| **Parse Tasks-plugin emoji dates** | On by default. Reads `📅 YYYY-MM-DD` as the due date; see [due dates](#due-dates). |
| **Include undated tasks** | Whether "Insert today's tasks" also lists tasks with no due date. |
| **Open in browser after create** | Open each newly created task automatically. |

Click **Test connection**. On success you'll see a notice with how many projects
were loaded, and the **Default project** dropdown fills. On failure you'll get a
plain-language message (see [Troubleshooting](#troubleshooting)).

## Commands

All commands live in the command palette (`Ctrl/Cmd-P`) and have **no default
hotkey** — assign your own in **Settings → Hotkeys** if you like.

### Create task from selection or line

Put your cursor on a task line (or select the text you want as the title) and run
the command. The plugin creates the task in the project this note
[routes to](#capture-routing), applies the note's and the line's
[labels](#labels), and rewrites the line.

**Before:**

```md
- [ ] Order rebar for the footings
```

**After:**

```md
- [ ] Order rebar for the footings [vk](https://vikunja.example.com/tasks/123) <!--vk:123-->
```

Notes:

- If a line already has a `<!--vk:…-->` marker, the command refuses to act — no
  duplicates.
- A trailing `→ [[Note]]` pointer is kept at the end of the line, and is **not**
  part of the task title:

  ```md
  - [ ] Pour footing → [[Footing pour details]]
  ```

  becomes

  ```md
  - [ ] Pour footing [vk](https://vikunja.example.com/tasks/9) <!--vk:9--> → [[Footing pour details]]
  ```

### Create task in project…

The same capture, except a fuzzy picker opens and asks which project to use. Type
to filter, `Enter` to choose, `Esc` to cancel — cancelling creates nothing.

Use it for the one-off that doesn't belong where the note normally routes: a task
you happen to be writing in a meeting note but that belongs to a different job.
Your choice **overrides** the note's `vikunja-project` and any folder rule, for
that one task only. Nothing about the note changes.

Labels are unaffected — you picked a project, not a label set, so the note's
`vikunja-labels` and the line's `#tags` still apply.

If the project list is empty, the command fetches it for you rather than making
you visit settings first; that also fills the **Default project** dropdown.

### Push all open tasks in note to Vikunja

Scans the whole note and creates a task for every unchecked `- [ ]` line that
doesn't already have a marker, rewriting each. Lines that already have a marker
are skipped. You get a summary like **"Created 4, skipped 1."** Every line in one
run goes to the same project — use "Create task in project…" for exceptions.

### Mark Vikunja task done

Cursor on a marked line. Sets the task done in Vikunja **and** flips the local
checkbox:

```md
- [ ] Submit permit application [vk](…/tasks/50) <!--vk:50-->
```

→

```md
- [x] Submit permit application [vk](…/tasks/50) <!--vk:50-->
```

### Toggle Vikunja task done/undone

Same as above but flips in whichever direction the checkbox currently is. Done and
undone only — kanban bucket moves are out of scope.

### Refresh Vikunja task statuses in note

For every marker in the note, fetches the current done-state from Vikunja and
updates the **local checkbox** to match. Vikunja is the source of truth for this
command only. If a task was deleted in Vikunja (404), the plugin reports its ID
and **leaves your line completely untouched** — it never edits or removes text.

### Insert today's Vikunja tasks

Inserts a read-only callout of tasks due today or overdue at your cursor:

```md
> [!todo] Vikunja — due today & overdue
> *Read-only snapshot generated 2026-07-24. Re-run "Insert today's Vikunja tasks" to refresh.*
>
> - **Order rebar for the footings** · due 2026-07-24 · High priority · [open](https://vikunja.example.com/tasks/123)
```

The block is fenced by hidden comment markers, so re-running the command
**replaces** it in place instead of adding a second copy. Turn on **Include
undated tasks** in settings to also list tasks with no due date.

### Open Vikunja task in browser

Cursor on a marked line; opens that task's page in your browser. No network call —
it just builds the URL from the marker, so it works offline.

## Frontmatter contract

The plugin reserves the `vikunja-*` frontmatter namespace.

```yaml
---
vikunja-project: 7            # numeric Vikunja project ID — authoritative
vikunja-project-name: Website # informational only; see note below
vikunja-labels:               # merged with the settings' default labels
  - website
  - q3
---
```

- **`vikunja-project`** — the numeric project ID. This is the authoritative
  routing key. **Active** — see [capture routing](#capture-routing) below.
- **`vikunja-project-name`** — a human label, kept in a *separate* key because
  Obsidian's Properties editor strips YAML comments, so you can't annotate the ID
  inline. Informational only; the plugin never routes on the name.
- **`vikunja-labels`** — a list, merged with the default labels from settings and
  with the line's own tags. **Active** — see [labels](#labels) below.

## Capture routing

The creating commands decide where a task goes in this order, stopping at the
first answer:

1. **A project you picked** with "Create task in project…" — that command asks
   every time, and your choice wins over everything below for that one task.
2. **`vikunja-project` in the note's frontmatter.**
3. **The first matching folder rule**, in the order you listed them in settings.
4. **The default project** from settings.

Every success Notice names the destination and the step that chose it, e.g.
`created task #123 in Website (#7) via folder rule "1204 *"`, so a
misrouted capture is visible immediately rather than days later.

### Folder rules

In **Settings → Vikunja Note Tasks → Folder rules**, one rule per line:

```
# job folders route by number, wherever they live
1204 * = 7
1300 * = 9

Clients/Acme/** = 12
```

- A pattern with **no `/`** is matched against each individual **folder name**, at
  any depth. `1204 *` matches `Active/1204 Website/Notes` *and*
  `Archive/2024/1204 Website` — so moving a job folder from `Active/` to
  `Archive/` never breaks its routing. That is the point of matching names rather
  than paths.
- A pattern **containing `/`** is matched against the whole folder path.
  `Clients/Acme/**` matches `Clients/Acme` and everything beneath it; a leading
  `**/` (as in `**/Clients/Acme`) lets the rule match at any depth.
- `*` matches within one folder name; `**` crosses folders; `?` matches a single
  character. Matching ignores case.
- **First match wins**, so put your most specific rules first.
- Blank lines and lines starting with `#` are ignored.
- The settings tab previews each rule beneath the box, resolving IDs to project
  names. A line it can't parse is listed there as ignored — if a rule isn't
  showing up, check that preview first.

### When routing can't decide

- **`vikunja-project` is present but isn't a number** (e.g. you typed a project
  *name*): the command stops and tells you, and **creates nothing**. It does not
  quietly fall back to the default project — the note explicitly asked for a
  different destination, so guessing would put the task somewhere wrong.
- **Nothing matches and there's no default project**: the command stops and asks
  you to set one of the three.

A note at the vault root has no folder name, so folder rules never match it; it
routes by frontmatter or falls through to the default project.

## Labels

Every created task gets labels from three sources, merged in this order:

1. **Default labels** from settings (e.g. `inbox, from-obsidian`).
2. **`vikunja-labels`** in the note's frontmatter — applies to every capture in
   that note.
3. **`#tags` on the captured line itself.**

Duplicates are removed ignoring case, and the first spelling wins — so if
settings say `Website` and the line says `#website`, you get one label, spelled
`Website`. Labels that don't exist in Vikunja yet are created for you.

```md
- [ ] Order rebar for the footings #site #urgent
```

becomes a task titled **"Order rebar for the footings"** with the labels `site`
and `urgent` (plus any note or default labels).

### Which tags leave the title

- **Tags at the end of the line are removed from the title** — they read as
  metadata, and you don't want them repeated in the task name.
- **A tag used mid-sentence stays put.** "Ask #urgent about the pump" is a
  sentence; the task keeps that title *and* gets the `urgent` label.
- A line that is *only* a tag keeps it as the title — otherwise there'd be
  nothing left to name the task.

### What is not treated as a tag

- **Headings** (`# Heading`) — a space follows the hash.
- **URL fragments** (`https://x.test/page#section`) — no whitespace before it.
- **Bare numbers** (`#1204`, `#14`) — a tag needs at least one non-digit, so job
  numbers and RFI references stay in the title where they belong.

Nested tags work: `#site/north` becomes the label `site/north`.

## Due dates

If you write due dates the way the [Tasks
plugin](https://publish.obsidian.md/tasks/) does, the plugin reads them:

```md
- [ ] Order rebar for the footings 📅 2026-08-10
```

creates a task titled **"Order rebar for the footings"** due **2026-08-10**. All
three of the emoji Tasks accepts for a due date work — `📅`, `📆`, `🗓`.

- The due date is set to **local midnight** on that day, so "due the 10th" stays
  the 10th no matter which side of UTC you're on.
- **Other emoji date fields are removed from the title but not otherwise used:**
  `⏳` scheduled, `🛫` start, `➕` created, `✅` done, `❌` cancelled. They're
  metadata, so they don't belong in a Vikunja task name — but only the due date
  has a Vikunja field to go into.
- **Recurrence (`🔁`) is left completely alone**, in the title and everywhere
  else. Its value is free text of unpredictable length, so there's no safe way to
  cut it out without risking a bite out of your title.
- **An impossible date is left alone** — `📅 2026-02-30` stays in the title and
  sets no due date, so you can see the typo rather than get a silently
  "corrected" date.
- A plain date with no emoji (`by 2026-08-10`) is just title text.

Turn off **Parse Tasks-plugin emoji dates** in settings to treat all of these as
ordinary title text.

## Mobile

Every command is available from the command palette on mobile, and there are no
default hotkeys to worry about.

To add a command to the **mobile toolbar**:

1. On mobile, open **Settings → Toolbar**.
2. Under **Manage toolbar options**, find the Vikunja Note Tasks command you want
   (e.g. "Create task from selection or line").
3. Tap the **+** to add it to the toolbar. Reorder as you like.

Now you can capture a line to Vikunja with one tap while editing on your phone.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| "Vikunja rejected the API token" | Token wrong, expired, or lacks permission | Recreate the token with read/write on tasks, projects, labels; paste it again. |
| "Could not reach Vikunja at …" | Wrong Base URL, server down, or offline | Check the URL (no `/api` suffix), that the server is reachable, and your connection. No note is changed when this happens. |
| "Vikunja returned not found" on refresh | The task was deleted in Vikunja | The plugin reports the ID and **leaves your line untouched** — it never deletes or edits the text for a missing task. |
| Project dropdown empty | Haven't tested the connection yet | Click **Test connection** in settings. |
| Task landed in the wrong project | A higher-priority routing step won | Read the Notice — it names the project *and* the step that chose it. Check `vikunja-project` in the note, then your folder rules in order (first match wins). |
| A folder rule seems ignored | It didn't parse, or an earlier rule matched first | Check the rule preview under the **Folder rules** box; unparseable lines are listed there as ignored. |
| "is not a numeric project ID" | `vikunja-project` holds a name, not an ID | Put the numeric ID in `vikunja-project` and the name in `vikunja-project-name`. Nothing was created. |
| Nothing happens on a line | The line already has a `<!--vk:…-->` marker | That line is already captured; the marker prevents duplicate creation. |
