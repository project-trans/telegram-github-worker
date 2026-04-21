# Telegram-GitHub Webhook Worker

A [Cloudflare Worker](https://workers.cloudflare.com) that receives [GitHub webhooks](https://docs.github.com/en/webhooks) and forwards formatted notifications to Telegram chats/channels.

## Features

- **Per-repo configuration** stored in Cloudflare KV, with org-level wildcard support
- **27+ GitHub event types** with dedicated HTML formatters (push, release, issues, PR, CI, security alerts, etc.)
- **Public/private filtering** — public targets only receive events from public repos, and sensitive events (security alerts) are filtered out
- **Multi-bot support** — each target can use a different Telegram bot token
- **Admin alerts** — signature failures and send errors are reported to a configurable admin chat
- **KV config sync tool** — CLI script to sync YAML/JSON config files to KV

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Cloudflare account](https://dash.cloudflare.com)
- [Telegram Bot](https://core.telegram.org/bots#how-do-i-create-a-bot)

## Setup

```bash
npm install
```

## Configuration

Create a `config.yaml`:

```yaml
"owner/repo":
  secret: "webhook-secret"
  targets:
    - bot_token: "123:abc"
      chat_id: "-100xxx"
      events: [push, release, issues, pull_request]
      public: false

"__admin__":
  bot_token: "456:def"
  chat_id: "123456789"
```

Sync to KV:

```bash
npx tsx scripts/sync-kv.ts config.yaml
```

## Development

```bash
npm run dev      # Start local dev server
npm run typecheck # Type checking
npm test          # Run tests
```

## Deployment

1. Create KV namespaces:
```bash
npx wrangler kv namespace create TG_GH_KV
npx wrangler kv namespace create TG_GH_KV --preview
```

2. Replace `KV_ID_PLACEHOLDER` and `KV_PREVIEW_ID_PLACEHOLDER` in `wrangler.toml` with the output IDs.

3. Deploy:
```bash
npm run deploy
```

4. Add the webhook in your GitHub repo settings:
   - **Payload URL**: `https://telegram-github-worker.<your-subdomain>.workers.dev`
   - **Content type**: `application/json`
   - **Secret**: Same as in your KV config

## License

MIT
