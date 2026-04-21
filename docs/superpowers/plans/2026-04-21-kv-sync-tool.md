# KV Config Sync Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI script that reads a YAML/JSON config file, validates it against Worker types, and fully syncs it to Cloudflare KV.

**Architecture:** Single script (`scripts/sync-kv.ts`) that parses config, validates types, then shells out to `wrangler` for KV operations. Validation reuses existing `src/types.ts` type definitions via simple runtime checks.

**Tech Stack:** TypeScript, `js-yaml` (dev dep), `wrangler` CLI, `tsx` (runner).

---

### Task 1: Install dependencies and create script

**Files:**
- Modify: `package.json`
- Create: `scripts/sync-kv.ts`

- [ ] **Step 1: Install js-yaml and tsx**

```bash
npm install -D js-yaml @types/js-yaml tsx
```

Expected: packages installed

- [ ] **Step 2: Create scripts/sync-kv.ts**

```typescript
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import * as yaml from "js-yaml";

interface Target {
  bot_token: string;
  chat_id: string;
  events: string[];
  public: boolean;
}

interface RepoConfig {
  secret: string;
  targets: Target[];
}

interface AdminConfig {
  bot_token: string;
  chat_id: string;
}

type ConfigMap = Record<string, RepoConfig | AdminConfig>;

function parseFile(filePath: string): ConfigMap {
  const raw = readFileSync(filePath, "utf-8");
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return yaml.load(raw) as ConfigMap;
  }
  if (filePath.endsWith(".json")) {
    return JSON.parse(raw) as ConfigMap;
  }
  throw new Error(`Unsupported file extension: ${filePath}. Use .yaml, .yml, or .json`);
}

function validateConfig(config: ConfigMap): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === "__admin__") {
      validateAdminConfig(value as AdminConfig, key);
    } else {
      validateRepoConfig(value as RepoConfig, key);
    }
  }
}

function validateAdminConfig(config: AdminConfig, key: string): void {
  if (typeof config.bot_token !== "string" || !config.bot_token) {
    throw new Error(`[${key}] bot_token must be a non-empty string`);
  }
  if (typeof config.chat_id !== "string" || !config.chat_id) {
    throw new Error(`[${key}] chat_id must be a non-empty string`);
  }
}

function validateRepoConfig(config: RepoConfig, key: string): void {
  if (typeof config.secret !== "string" || !config.secret) {
    throw new Error(`[${key}] secret must be a non-empty string`);
  }
  if (!Array.isArray(config.targets)) {
    throw new Error(`[${key}] targets must be an array`);
  }
  for (let i = 0; i < config.targets.length; i++) {
    const t = config.targets[i];
    if (typeof t.bot_token !== "string" || !t.bot_token) {
      throw new Error(`[${key}] targets[${i}].bot_token must be a non-empty string`);
    }
    if (typeof t.chat_id !== "string" || !t.chat_id) {
      throw new Error(`[${key}] targets[${i}].chat_id must be a non-empty string`);
    }
    if (!Array.isArray(t.events)) {
      throw new Error(`[${key}] targets[${i}].events must be an array`);
    }
    if (typeof t.public !== "boolean") {
      throw new Error(`[${key}] targets[${i}].public must be a boolean`);
    }
  }
}

function wrangler(args: string): string {
  return execSync(`npx wrangler ${args}`, { encoding: "utf-8" });
}

function kvKey(name: string): string {
  return `config:${name}`;
}

interface KvEntry {
  name: string;
}

function listConfigKeys(): string[] {
  const output = wrangler(`kv:key list --binding=TG_GH_KV --prefix=config:`);
  try {
    const entries: KvEntry[] = JSON.parse(output);
    return entries.map((e) => e.name);
  } catch {
    return [];
  }
}

function syncConfig(config: ConfigMap): void {
  const desiredKeys = new Set(Object.keys(config).map(kvKey));
  const existingKeys = listConfigKeys();

  let deleted = 0;
  for (const key of existingKeys) {
    if (!desiredKeys.has(key)) {
      wrangler(`kv:key delete --binding=TG_GH_KV "${key}"`);
      console.log(`Deleted: ${key}`);
      deleted++;
    }
  }

  let written = 0;
  for (const [name, value] of Object.entries(config)) {
    const key = kvKey(name);
    const json = JSON.stringify(value);
    wrangler(`kv:key put --binding=TG_GH_KV "${key}" '${json.replace(/'/g, "'\\''")}'`);
    console.log(`Written: ${key}`);
    written++;
  }

  console.log(`\nSummary: ${written} written, ${deleted} deleted`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/sync-kv.ts <config-file>");
    process.exit(1);
  }

  const filePath = args[0];

  let config: ConfigMap;
  try {
    config = parseFile(filePath);
  } catch (e) {
    console.error("Failed to parse config file:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    validateConfig(config);
  } catch (e) {
    console.error("Config validation failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    syncConfig(config);
  } catch (e) {
    console.error("KV sync failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors (may need to adjust tsconfig `include` to also cover `scripts/`)

- [ ] **Step 4: Update tsconfig.json to include scripts**

Read `tsconfig.json` and add `"scripts/**/*.ts"` to the `include` array:

```json
"include": ["src/**/*.ts", "scripts/**/*.ts"]
```

- [ ] **Step 5: Run typecheck again**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Create a sample config file for testing**

Create `config.example.yaml`:

```yaml
"owner/repo":
  secret: "webhook-secret-123"
  targets:
    - bot_token: "123:abc"
      chat_id: "-100xxx"
      events: [push, release]
      public: false

"__admin__":
  bot_token: "admin:token"
  chat_id: "123456789"
```

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-kv.ts package.json package-lock.json tsconfig.json config.example.yaml
git commit -m "feat: add KV config sync tool"
```

---

### Task 2: Add tests for validation logic

**Files:**
- Create: `test/sync-kv.test.ts`

- [ ] **Step 1: Create test/sync-kv.test.ts**

Since the script uses `process.exit`, extract the validation functions into a testable module first. Create `scripts/validate.ts`:

```typescript
interface Target {
  bot_token: string;
  chat_id: string;
  events: string[];
  public: boolean;
}

interface RepoConfig {
  secret: string;
  targets: Target[];
}

interface AdminConfig {
  bot_token: string;
  chat_id: string;
}

type ConfigMap = Record<string, RepoConfig | AdminConfig>;

export function validateConfig(config: ConfigMap): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === "__admin__") {
      validateAdminConfig(value as AdminConfig, key);
    } else {
      validateRepoConfig(value as RepoConfig, key);
    }
  }
}

export function validateAdminConfig(config: AdminConfig, key: string): void {
  if (typeof config.bot_token !== "string" || !config.bot_token) {
    throw new Error(`[${key}] bot_token must be a non-empty string`);
  }
  if (typeof config.chat_id !== "string" || !config.chat_id) {
    throw new Error(`[${key}] chat_id must be a non-empty string`);
  }
}

export function validateRepoConfig(config: RepoConfig, key: string): void {
  if (typeof config.secret !== "string" || !config.secret) {
    throw new Error(`[${key}] secret must be a non-empty string`);
  }
  if (!Array.isArray(config.targets)) {
    throw new Error(`[${key}] targets must be an array`);
  }
  for (let i = 0; i < config.targets.length; i++) {
    const t = config.targets[i];
    if (typeof t.bot_token !== "string" || !t.bot_token) {
      throw new Error(`[${key}] targets[${i}].bot_token must be a non-empty string`);
    }
    if (typeof t.chat_id !== "string" || !t.chat_id) {
      throw new Error(`[${key}] targets[${i}].chat_id must be a non-empty string`);
    }
    if (!Array.isArray(t.events)) {
      throw new Error(`[${key}] targets[${i}].events must be an array`);
    }
    if (typeof t.public !== "boolean") {
      throw new Error(`[${key}] targets[${i}].public must be a boolean`);
    }
  }
}
```

Then update `scripts/sync-kv.ts` to import from `./validate` instead of having the validation functions inline. Remove the validation functions from `sync-kv.ts` and add:

```typescript
import { validateConfig } from "./validate";
```

- [ ] **Step 2: Create test/sync-kv.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { validateConfig, validateAdminConfig, validateRepoConfig } from "../scripts/validate";

describe("validateAdminConfig", () => {
  it("accepts valid admin config", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "123:abc", chat_id: "456" }, "admin")
    ).not.toThrow();
  });

  it("rejects missing bot_token", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "", chat_id: "456" } as any, "admin")
    ).toThrow("[admin] bot_token");
  });

  it("rejects missing chat_id", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "123", chat_id: "" } as any, "admin")
    ).toThrow("[admin] chat_id");
  });
});

describe("validateRepoConfig", () => {
  const validConfig = {
    secret: "s",
    targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: false }],
  };

  it("accepts valid repo config", () => {
    expect(() => validateRepoConfig(validConfig, "owner/repo")).not.toThrow();
  });

  it("rejects missing secret", () => {
    expect(() =>
      validateRepoConfig({ ...validConfig, secret: "" } as any, "owner/repo")
    ).toThrow("[owner/repo] secret");
  });

  it("rejects non-array targets", () => {
    expect(() =>
      validateRepoConfig({ ...validConfig, targets: "bad" } as any, "owner/repo")
    ).toThrow("[owner/repo] targets");
  });

  it("rejects target with missing bot_token", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "", chat_id: "c", events: ["push"], public: false }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].bot_token");
  });

  it("rejects target with missing events", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: "bad" as any, public: false }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].events");
  });

  it("rejects target with non-boolean public", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: "yes" as any }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].public");
  });
});

describe("validateConfig", () => {
  it("routes __admin__ to admin validation", () => {
    expect(() =>
      validateConfig({ "__admin__": { bot_token: "t", chat_id: "c" } })
    ).not.toThrow();
  });

  it("routes other keys to repo validation", () => {
    expect(() =>
      validateConfig({
        "owner/repo": { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: false }] },
      })
    ).not.toThrow();
  });

  it("rejects invalid admin config in full config", () => {
    expect(() =>
      validateConfig({ "__admin__": { bot_token: "", chat_id: "c" } as any })
    ).toThrow("[__admin__] bot_token");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass (existing 12 + new 10 = 22)

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add scripts/validate.ts scripts/sync-kv.ts test/sync-kv.test.ts
git commit -m "test: add validation tests for KV sync tool"
```
