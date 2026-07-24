# Example note templates

These are **example notes**, not runtime templates — copy the shape into your own
vault. They demonstrate the patterns this plugin is built around:

- **A task is a line until it accrues artifacts.** The line is the task of record;
  when it grows, it gets a `→ [[Wikilink]]` pointer to a note holding the details.
- **The `vikunja-*` frontmatter contract** (documented in 0.1; routing ships in
  0.2). See [USER_GUIDE.md](../../USER_GUIDE.md#frontmatter-contract).
- **What a line looks like before and after capture** — some lines below already
  carry a `[vk](…) <!--vk:id-->` marker to show the "after" state.

Two fictional projects are shown; all names, numbers, and details are invented.

| Project | Flavour | Files |
| --- | --- | --- |
| Website Redesign | generic | `website-redesign-hub.md`, `website-redesign-meeting.md`, `website-redesign-phase.md` |
| Treatment Plant Upgrade | construction | `plant-upgrade-hub.md`, `plant-upgrade-meeting.md`, `plant-upgrade-phase.md` |

> The example task IDs (`<!--vk:###-->`) are illustrative. In your vault the
> plugin assigns real Vikunja task IDs when you run a create command.
