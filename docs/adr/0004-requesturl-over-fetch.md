# 4. Use Obsidian's requestUrl, never fetch/axios

- **Status:** Accepted
- **Date:** 2026-07-24

## Context

The plugin must be fully mobile compatible (`isDesktopOnly: false`). On iOS and
Android, plugin code runs in a WebView where cross-origin `fetch`/`XMLHttpRequest`
to a user's Vikunja server is subject to CORS — and self-hosted servers usually
don't send permissive CORS headers for an app origin. Node's `http` and Electron
APIs are unavailable on mobile, so they are not an option either.

## Decision

Route **all** HTTP through Obsidian's `requestUrl` API. It performs requests
outside the WebView's CORS boundary and works identically on desktop and mobile.
No `fetch`, `axios`, Node `http`, or Electron networking anywhere in `src/`. All
network access is isolated to the single `api.ts` module.

## Consequences

- The plugin works against self-hosted Vikunja on mobile without the user having
  to configure CORS on their server.
- We handle `requestUrl` semantics directly: `throw: false` to inspect status
  codes, mapping thrown errors to a `network` failure class, and reading
  `response.json` / `response.text` ourselves.
- Testing the client would require mocking `requestUrl`; we keep `api.ts` thin
  and push the risky logic into pure, tested modules instead.
- No third-party HTTP dependency to audit or ship.
