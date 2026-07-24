# Contributing

Thanks for your interest in Vikunja Note Tasks. This is a small, deliberately
focused plugin — please read this before opening a pull request.

## Scope and the one boundary

The plugin does **explicit, user-triggered actions only**. Background sync,
polling, real-time watching, task deletion, and multi-user reconciliation are
**permanent non-goals** (see [ROADMAP.md](ROADMAP.md)). PRs that add any of these
will be declined no matter how well implemented. If you're unsure whether a change
fits, open an issue first.

## Issue-first

Please **open an issue before writing code** for anything beyond a typo or an
obvious small fix. It saves everyone time: we can agree the change fits the scope
and design before you invest effort.

## Small, focused PRs

- One logical change per PR. Small PRs get reviewed; large ones stall.
- Update docs **in the same PR** as the change: `CHANGELOG.md` always, plus
  `README.md` / `USER_GUIDE.md` / `docs/*` as relevant. See
  [`CLAUDE.md`](CLAUDE.md) for the full conventions.
- Keep pure logic in `src/markers.ts` / `src/render.ts` (no `obsidian` import) and
  add tests for it.

## Running the checks

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test via tsx
npm run build       # typecheck + esbuild bundle
```

All three must pass before you push. CI runs the same checks.

## Developer Certificate of Origin (DCO)

External contributions must be **signed off** to certify you have the right to
submit them under the project's GPL-3.0-or-later license. Sign off each commit:

```bash
git commit -s -m "Your message"
```

The `-s` flag appends a `Signed-off-by: Your Name <you@example.com>` trailer,
which asserts the [Developer Certificate of Origin](https://developercertificate.org/).

A **DCO GitHub App** enforces this on pull requests: unsigned commits will fail
the DCO check. (Installing the app on the repository is a one-time maintainer
step — it's listed in the submission checklist in
[`docs/SUBMISSION.md`](docs/SUBMISSION.md).)

If you forgot to sign off, amend or rebase with `-s` and force-push **your own PR
branch** (never a shared branch).

## Commit messages

Concise, professional, imperative subject lines (e.g. "Add label caching to push
command"). No attribution or tooling footers.

## Code of conduct

Be kind and constructive. Assume good faith.
