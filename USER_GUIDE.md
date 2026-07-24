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
dropdown instead, but IDs matter for the [frontmatter contract](#frontmatter-contract).

## Settings

Open **Settings → Community plugins → Vikunja Note Tasks**.

| Setting | What to enter |
| --- | --- |
| **Base URL** | `https://vikunja.example.com` |
| **API token** | The token from step 1. Stored **unencrypted** in the vault's plugin data — use a least-privilege token. |
| **Default project** | Click **Test connection** first to load the list, then pick one. |
| **Default labels** | Comma-separated, e.g. `inbox, from-obsidian`. Applied to every created task; missing labels are created for you. |
| **Include undated tasks** | Whether "Insert today's tasks" also lists tasks with no due date. |
| **Open in browser after create** | Open each newly created task automatically. |

Click **Test connection**. On success you'll see a notice with how many projects
were loaded, and the **Default project** dropdown fills. On failure you'll get a
plain-language message (see [Troubleshooting](#troubleshooting)).

## Commands

Command walkthroughs with before/after Markdown examples are added as each
command ships. See the command table in the [README](README.md#commands) for the
current list. All commands live in the command palette and have **no default
hotkey** — assign your own in **Settings → Hotkeys** if you like.

## Frontmatter contract

The plugin reserves the `vikunja-*` frontmatter namespace. **In 0.1 these keys
are documented but not yet used for routing** (new tasks always go to the default
project). Routing ships in 0.2 — adopt the keys now and your vault is ready.

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
  routing key.
- **`vikunja-project-name`** — a human label, kept in a *separate* key because
  Obsidian's Properties editor strips YAML comments, so you can't annotate the ID
  inline. Informational only; the plugin never routes on the name.
- **`vikunja-labels`** — a list, merged with the default labels from settings.

### Resolution order (once routing ships in 0.2)

1. Note frontmatter (`vikunja-project`)
2. Folder-to-project mapping (plugin settings)
3. Default project (settings)

0.1 uses the default project only.

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
| Nothing happens on a line | The line already has a `<!--vk:…-->` marker | That line is already captured; the marker prevents duplicate creation. |
