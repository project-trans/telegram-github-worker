# Design: KV Config Sync Tool

## Overview

A CLI script that reads a YAML/JSON config file and fully syncs it to Cloudflare KV. Only keys with the `config:` prefix are managed; other KV keys are untouched.

## Usage

```bash
npx tsx scripts/sync-kv.ts <config-file>
```

Example:
```bash
npx tsx scripts/sync-kv.ts config.yaml
```

## Config File Format

YAML or JSON. File extension (`.yaml`/`.yml`/`.json`) determines the parser.

Top-level keys map to KV keys with `config:` prefix:

```yaml
"owner/repo":
  secret: "webhook-secret-123"
  targets:
    - bot_token: "123:abc"
      chat_id: "-100xxx"
      events: [push, release]
      public: false

"owner/*":
  secret: "webhook-secret-456"
  targets:
    - bot_token: "789:def"
      chat_id: "@channel"
      events: [issues]
      public: true

"__admin__":
  bot_token: "admin:token"
  chat_id: "123456789"
```

This produces KV keys: `config:owner/repo`, `config:owner/*`, `config:__admin__`.

## Validation

Before syncing, validate all entries against the Worker's type definitions:

- `__admin__` → must match `AdminConfig`: `bot_token: string`, `chat_id: string`
- All other keys → must match `RepoConfig`: `secret: string`, `targets: Target[]`, where each `Target` has `bot_token: string`, `chat_id: string`, `events: string[]`, `public: boolean`
- Validation failure → exit with specific error (key + field name), no sync performed

## Sync Flow

1. Parse config file into `Record<string, object>`
2. Validate all entries against `AdminConfig` / `RepoConfig` types
3. List all existing KV keys with `config:` prefix via `wrangler kv:key list --prefix=config:`
4. For each existing key NOT in the config file, delete via `wrangler kv:key delete`
5. For each entry in the config file, write via `wrangler kv:key put`
6. Report summary: keys added, updated, deleted

## Tech Details

- Runs `wrangler` CLI commands via `child_process.execSync`
- Uses `js-yaml` for YAML parsing (dev dependency)
- JSON parsing uses built-in `JSON.parse`
- Binding name `TG_GH_KV` is read from `wrangler.toml` or can be passed as argument

## Error Handling

- File not found → exit with error message
- Invalid YAML/JSON → exit with parse error
- `wrangler` command fails → exit with the error output
- No config file provided → show usage

## Dependencies

- `js-yaml` (devDependency, for YAML parsing)
- `@types/js-yaml` (devDependency, for type definitions)
