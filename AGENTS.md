# AGENTS.md

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Local dev server (wrangler dev)
npm run typecheck    # TypeScript type checking
npm test             # Run all tests (vitest)
npm run deploy       # Deploy to Cloudflare Workers
```

Run typecheck before committing. Tests are required.

## Architecture

Cloudflare Worker that receives GitHub webhooks and forwards to Telegram.

```
src/
  index.ts              # Worker entrypoint (fetch handler)
  router.ts             # HMAC-SHA256 signature verification
  config.ts             # KV config lookup (exact → wildcard → null)
  matcher.ts            # Event/target matching with public visibility filter
  telegram.ts           # Telegram Bot API client (sendMessage, sendAlert, escapeHtml)
  types.ts              # Shared TypeScript types (Target, RepoConfig, AdminConfig, GitHubEvent)
  formatters/
    index.ts            # Event type → formatter mapping + fallback
    *.ts                # One formatter per GitHub event type (27 total)
```

## Configuration

Config lives in Cloudflare KV (binding: `TG_GH_KV`). Key format:

- `config:owner/repo` — per-repo config (exact match)
- `config:owner/*` — org-level wildcard fallback
- `config:__admin__` — admin alert target

Sync tool: `npx tsx scripts/sync-kv.ts config.yaml`

Config validation is in `scripts/validate.ts`, tests in `test/sync-kv.test.ts`.

## Key Conventions

- Zero runtime dependencies — only `@cloudflare/workers-types` as dev dep
- Formatters output HTML for Telegram's `parse_mode: "HTML"`
- `escapeHtml()` on all user-supplied content before embedding in HTML
- Sensitive events (security alerts) are filtered from `public: true` targets
- Errors send alerts to admin chat, then return appropriate HTTP status
- `wrangler.toml` uses `KV_ID_PLACEHOLDER` and `KV_PREVIEW_ID_PLACEHOLDER` — replace before deploy

## Testing

- Tests use vitest
- `test/telegram.test.ts` — escapeHtml
- `test/matcher.test.ts` — target matching with public/sensitive filtering
- `test/formatters.test.ts` — fallback, push, release, issues formatters
- `test/sync-kv.test.ts` — config validation
