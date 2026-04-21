# Design: GitHub Webhook → Telegram Notification Worker

## Overview

A Cloudflare Worker that receives GitHub webhooks, matches them against per-repo configuration stored in KV, formats event data as HTML, and sends notifications to Telegram chats/channels.

## Architecture

```
GitHub Webhook (POST)
  → Cloudflare Worker
  → HMAC-SHA256 signature verification
  → KV config lookup (config:owner/repo, fallback config:owner/*)
  → Event type matching against targets
  → Public visibility filter (for public targets)
  → Dedicated formatter per event type
  → Telegram Bot API (sendMessage, HTML parse mode)
```

## Directory Structure

```
src/
  index.ts           — Worker entrypoint (fetch handler)
  router.ts          — Route handling, signature verification
  config.ts          — KV config read, parse, cache
  matcher.ts         — Repo/event type matching logic
  telegram.ts        — Telegram Bot API client (sendMessage)
  formatters/
    index.ts         — Event type → formatter mapping
    push.ts
    release.ts
    issues.ts
    issue_comment.ts
    pull_request.ts
    pull_request_review.ts
    pull_request_review_comment.ts
    pull_request_review_thread.ts
    commit_comment.ts
    create.ts
    delete.ts
    discussion.ts
    discussion_comment.ts
    fork.ts
    status.ts
    workflow_run.ts
    check_run.ts
    code_scanning_alert.ts
    dependabot_alert.ts
    package.ts
    registry_package.ts
    repository_advisory.ts
    secret_scanning_alert.ts
    secret_scanning_alert_location.ts
    sponsorship.ts
    star.ts
    sub_issues.ts
    fallback.ts       — Generic fallback for unknown events
  types.ts            — TypeScript type definitions
```

## Configuration (KV)

### Per-repo config

Key format: `config:owner/repo`
Value: JSON

```json
{
  "secret": "webhook-secret-123",
  "targets": [
    {
      "bot_token": "123:abc",
      "chat_id": "-100xxx",
      "events": ["push", "release"],
      "public": false
    },
    {
      "bot_token": "456:def",
      "chat_id": "@mychannel",
      "events": ["issues", "issue_comment"],
      "public": true
    }
  ]
}
```

### Org-level wildcard

Key format: `config:owner/*`
Matches any repo under the org that has no exact config key.

### Admin config

Key: `config:__admin__`
Value: JSON

```json
{
  "bot_token": "123:abc",
  "chat_id": "123456789"
}
```

Used for: signature verification failures, KV read errors, Telegram send errors.

### Matching priority

1. `config:owner/repo` (exact match)
2. `config:owner/*` (org wildcard)
3. No match → drop event silently

## Event Processing Flow

1. Receive POST request
2. Read `X-GitHub-Event` header and request body
3. Extract `repository.full_name` from body
4. Look up config from KV (`config:owner/repo`, fallback `config:owner/*`)
5. Verify HMAC-SHA256 signature using `config.secret`
   - Failure → send alert to `config:__admin__`, return 401
6. Iterate targets, check if event type is in `target.events`
7. If `target.public === true`:
   - Skip if `repository.private === true`
   - Skip if event type is sensitive
8. Call formatter for event type (or `fallback.ts`)
9. Send formatted message via Telegram Bot API (HTML parse mode)
10. On any error (KV, Telegram, etc.) → send alert to `config:__admin__`

## Sensitive Event Types

These require write/read access to the repository and must not be sent to `public: true` targets:

- `code_scanning_alert`
- `dependabot_alert`
- `repository_advisory`
- `secret_scanning_alert`
- `secret_scanning_alert_location`

## Message Formatting

- Each event type has a dedicated formatter in `src/formatters/<event_type>.ts`
- Formatters output HTML for Telegram's HTML parse mode
- Each formatter receives the full GitHub event payload and returns a string
- `fallback.ts` handles unknown events with a generic template: `[repo] event_type event - url`
- Messages should include: repo name, event-specific key info, relevant links

## Supported Event Types

`push`, `release`, `issues`, `issue_comment`, `pull_request`, `pull_request_review`, `pull_request_review_comment`, `pull_request_review_thread`, `commit_comment`, `create`, `delete`, `discussion`, `discussion_comment`, `fork`, `status`, `workflow_run`, `check_run`, `code_scanning_alert`, `dependabot_alert`, `package`, `registry_package`, `repository_advisory`, `secret_scanning_alert`, `secret_scanning_alert_location`, `sponsorship`, `star`, `sub_issues`

## Error Handling

All errors (signature verification, KV failures, Telegram API failures) send alerts to the admin chat configured in `config:__admin__`. The Worker returns appropriate HTTP status codes (401 for auth failures, 500 for internal errors, 200 for success).

## Tech Stack

- TypeScript
- Cloudflare Workers
- KV Storage
- wrangler CLI
- No external runtime dependencies (only `@cloudflare/workers-types` as dev dependency)
