# Repository Guidelines

## Ops Scope & Layout
- This repo anchors shared infrastructure for the Dexter stack: nginx templates, PM2 configs, smoke tests, and preview assets.
- Keep sibling repos (`dexter-api`, `dexter-fe`, `dexter-mcp`, `dexter-agents`) under `/home/branchmanager/websites/` so scripts can locate env files and publish assets without extra flags.
- Docs live under `ops/`, with deploy-ready assets stored in `/var/www/docs.dexter.cash/` (served via nginx).

## Commit & Review Expectations
- Favor single-purpose commits with imperative subjects (`Add pm2 helper for agents service`).
- Update `OPERATIONS.md` when changing deployment steps or port maps; cross-link issues in commit bodies if the change affects downstream services.
- Run `npm run smoke:prod` before merging changes that touch nginx, PM2, or environment loaders.

## Scripts & Utilities
- `dxsnap` – runs from anywhere, refreshes preview media and the shared wordmark quietly (`node ops/scripts/capture-previews.mjs --quiet`). Requires Playwright dependencies (run `npm install` and `npx playwright install --with-deps` once).
- `npm run capture:previews` – verbose variant for detailed output or troubleshooting.
- `ops/scripts/apply-nginx-alpha.sh` – example bootstrap for nginx configs; inspect outputs before running in production.
- **Dexchat harness** – `scripts/dexchat.js` exposes the Playwright driver with CLI flags; `scripts/check-realtime.js` is the legacy wrapper that reads the same parameters from `HARNESS_*` env vars. Both call `scripts/runHarness.js`, so behavior stays identical whether a run is triggered by flags or exported variables. `scripts/run-pumpstream-harness.js` extends the same engine with MCP API checks—use `npm run pumpstream:harness` when you need the dual UI+API scenario. Append `--guest` to either harness when you want to ignore stored auth for the UI; the API leg will still reuse the shared demo bearer (`TOKEN_AI_MCP_TOKEN`).

## UI Guidelines
- **Tool notes** now share the primitives in `src/app/components/toolNotes/solanaVisuals.tsx`. Prefer those `MetricPill`, `TokenFlow`, and `HashBadge` helpers when adding or modifying renderers to keep spacing consistent.
- **Web research tools** (`search`, `fetch`) operate on Tavily output. Expect `snippet`, `text`, `favicon`, and `response_time` fields and surface them prominently—avoid the old “document search” copy.
- Markdown output auto-detects Solana addresses/signatures via the `solanaArtifactsRemarkPlugin`; do not strip base58 values from transcripts, the badge renderer handles them safely.

## Deployment & Verification
- PM2 process definitions live in `ops/ecosystem.config.cjs`. After edits, use `pm2 restart <process>` and confirm the change with `npm run smoke:prod`.
- nginx updates require `sudo nginx -t && sudo systemctl reload nginx`; keep config diffs small and documented.
- Shared assets (screenshots, wordmark) should be regenerated with `dxsnap` after any FE or docs change that affects previews.
- Logging hygiene – `LOG_LEVEL` defaults to `info`; bump it to `debug` for verbose traces or drop to `warn` when you need quiet tails. `LOG_PRETTY=1` forces colors in PM2 logs (handy for quick triage); unset it when shipping raw JSON to collectors.

## Knowledge Base
- `OPERATIONS.md` contains the condensed runbook (PM2, nginx, smoke tests, troubleshooting).
- `ops/previews/` houses the local copies of README media; synced to `https://docs.dexter.cash/previews/` on every `dxsnap` run.
- For long-form architecture notes, use the GitBook instance on `docs.dexter.cash` and link from this repo when relevant.
### Supabase Session Refresh

- Use the desktop helper `refresh-supabase-session.ps1` whenever the Turnstile/Supabase session expires. It launches the SOCKS proxy, opens Chrome, and waits while you finish the login.
- After you are signed in, open DevTools → **Console** and paste the contents of `scripts/devtools-cookie-helper.js`. The helper prints (and copies) the combined `sb-…-auth-token; sb-…-refresh-token` header expected by the harness.
- Back on Linux, run `npm run dexchat:refresh` (or `dexchat refresh`) and paste that header when prompted. The script writes `HARNESS_COOKIE` into both `.env` files and regenerates `~/websites/dexter-mcp/state.json`.
- The desktop helper still warns if the refresh token is missing; without it the harness can’t mint per-user MCP JWTs.

### Harness Auth Flow (Quick Reference)

```
Turnstile + Supabase login (desktop helper)
           │  generates encoded cookie + state.json
           ▼
HARNESS_COOKIE in repos (.env)
           │  injected into Playwright runs
           ▼
Dexchat / pumpstream harness executions
```

- **Daily driver** – `dexchat refresh` (or `npm run dexchat:refresh`) prompts for the encoded cookie, updates both repos, and rewrites `~/websites/dexter-mcp/state.json` locally. No proxy required.
- **When everything stops working** – `refresh-supabase-session.ps1` rebuilds the Supabase session via SOCKS + Chrome; afterwards rerun `dexchat refresh` with the new cookie.
- Storage state only changes when `dexchat` runs with `--storage` (the helper does this for you). MCP harnesses read the canonical `state.json` from their repo, which is why we save it there.
- Add `--guest` to Dexchat or the pumpstream harness to bypass stored auth without scrubbing env files.

See `scripts/README.md` for full command examples and troubleshooting notes.

Someday, when robust automatic cookie refresh is needed, review: `/home/branchmanager/websites/dexter-agents/CDP_SUPPORT.md`
