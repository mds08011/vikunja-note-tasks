# 5. License under GPL-3.0-or-later

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

We consulted the existing
[Heiss/obsidian-vikunja-plugin](https://github.com/Heiss/obsidian-vikunja-plugin)
for reference on the Vikunja API and Obsidian plugin patterns. That project is
licensed **GPL-3.0**. Where we borrow from it (with copyright notices preserved),
our work must be license-compatible. We also value the copyleft guarantee that
downstream users keep the freedoms this project grants.

## Decision

License the plugin **GPL-3.0-or-later**. The full license text is in `LICENSE`;
the license is declared in `package.json` (`"license": "GPL-3.0-or-later"`), noted
in the `manifest.json` context, and referenced from the README. Any code borrowed
from the Heiss plugin retains its original copyright and license notices.

We deliberately do **not** adopt that plugin's bidirectional sync architecture
(see ADR 0001); borrowing is limited to genuinely useful, self-contained pieces.

## Consequences

- Full compatibility with the GPL-3.0 code we reference or borrow from.
- Downstream forks and redistributions must remain under GPL-3.0-or-later.
- The Obsidian community directory accepts GPL-licensed plugins; the license is
  called out in the submission checklist.
- `fundingUrl` is intentionally omitted for now; `docs/SUBMISSION.md` notes how to
  add it later.
