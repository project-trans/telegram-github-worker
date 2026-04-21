# Telegram-GitHub Webhook Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker that receives GitHub webhooks, matches them against KV-stored per-repo config, formats events as HTML, and sends notifications to Telegram.

**Architecture:** Modular TypeScript worker with separated concerns — routing/signature verification, KV config lookup with caching, event-target matching with public visibility filtering, per-event-type formatters, and Telegram API client. Zero runtime dependencies.

**Tech Stack:** TypeScript, Cloudflare Workers, KV Storage, wrangler CLI. Dev dependency: `@cloudflare/workers-types`.

---

### Task 1: Project scaffolding and type definitions

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "telegram-github-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250420.0",
    "typescript": "^5.7.0",
    "wrangler": "^4.14.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: dependencies installed, no errors

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "telegram-github-worker"
main = "src/index.ts"
compatibility_date = "2025-04-21"

[[kv_namespaces]]
binding = "CONFIG_KV"
id = "PLACEHOLDER"
preview_id = "PLACEHOLDER"
```

- [ ] **Step 5: Create src/types.ts**

```typescript
export interface Target {
  bot_token: string;
  chat_id: string;
  events: string[];
  public: boolean;
}

export interface RepoConfig {
  secret: string;
  targets: Target[];
}

export interface AdminConfig {
  bot_token: string;
  chat_id: string;
}

export interface GitHubEvent {
  action?: string;
  repository?: {
    full_name: string;
    private: boolean;
    html_url: string;
    name: string;
    owner: {
      login: string;
    };
  };
  sender?: {
    login: string;
    html_url: string;
  };
  [key: string]: unknown;
}
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json wrangler.toml src/types.ts
git commit -m "feat: add project scaffolding and type definitions"
```

---

### Task 2: Telegram API client

**Files:**
- Create: `src/telegram.ts`

- [ ] **Step 1: Create src/telegram.ts**

```typescript
interface SendMessageParams {
  bot_token: string;
  chat_id: string;
  text: string;
}

export async function sendMessage(params: SendMessageParams): Promise<Response> {
  const url = `https://api.telegram.org/bot${params.bot_token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: params.chat_id,
    text: params.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${errorBody}`);
  }

  return response;
}

export async function sendAlert(
  adminConfig: { bot_token: string; chat_id: string },
  message: string,
): Promise<void> {
  try {
    await sendMessage({
      bot_token: adminConfig.bot_token,
      chat_id: adminConfig.chat_id,
      text: `<b>[Alert]</b> ${escapeHtml(message)}`,
    });
  } catch {
    // Cannot alert about alert failures — silently drop
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/telegram.ts
git commit -m "feat: add Telegram API client"
```

---

### Task 3: Config module (KV read, parse, cache)

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create src/config.ts**

```typescript
import type { RepoConfig, AdminConfig } from "./types";

export const ADMIN_KEY = "config:__admin__";

function configKey(repo: string): string {
  return `config:${repo}`;
}

function wildcardKey(owner: string): string {
  return `config:${owner}/*`;
}

export async function getRepoConfig(
  kv: KVNamespace,
  fullName: string,
): Promise<RepoConfig | null> {
  const [owner] = fullName.split("/");

  const exact = await kv.get(configKey(fullName));
  if (exact) {
    return JSON.parse(exact) as RepoConfig;
  }

  const wildcard = await kv.get(wildcardKey(owner));
  if (wildcard) {
    return JSON.parse(wildcard) as RepoConfig;
  }

  return null;
}

export async function getAdminConfig(
  kv: KVNamespace,
): Promise<AdminConfig | null> {
  const raw = await kv.get(ADMIN_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as AdminConfig;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: add KV config lookup module"
```

---

### Task 4: Matcher module (event/target matching + public filter)

**Files:**
- Create: `src/matcher.ts`

- [ ] **Step 1: Create src/matcher.ts**

```typescript
import type { Target, RepoConfig } from "./types";

const SENSITIVE_EVENTS = new Set([
  "code_scanning_alert",
  "dependabot_alert",
  "repository_advisory",
  "secret_scanning_alert",
  "secret_scanning_alert_location",
]);

export interface MatchedTarget extends Target {
  bot_token: string;
  chat_id: string;
}

export function matchTargets(
  config: RepoConfig,
  eventType: string,
  isPrivate: boolean,
): MatchedTarget[] {
  const results: MatchedTarget[] = [];

  for (const target of config.targets) {
    if (!target.events.includes(eventType)) continue;

    if (target.public) {
      if (isPrivate) continue;
      if (SENSITIVE_EVENTS.has(eventType)) continue;
    }

    results.push(target);
  }

  return results;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/matcher.ts
git commit -m "feat: add event-target matching with public visibility filter"
```

---

### Task 5: Signature verification module

**Files:**
- Create: `src/router.ts`

- [ ] **Step 1: Create src/router.ts**

```typescript
async function verifySignature(
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigParts = signatureHeader.split("=");
  if (sigParts.length !== 2 || sigParts[0] !== "sha256") return false;

  const sigBytes = hexToBytes(sigParts[1]);
  const dataBytes = encoder.encode(body);

  return crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export { verifySignature };
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/router.ts
git commit -m "feat: add HMAC-SHA256 signature verification"
```

---

### Task 6: Fallback formatter

**Files:**
- Create: `src/formatters/fallback.ts`
- Create: `src/formatters/index.ts`

- [ ] **Step 1: Create src/formatters/fallback.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatFallback(event: GitHubEvent, eventType: string): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const action = event.action ? ` ${event.action}` : "";

  return [
    `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b>`,
    `${eventType}${action} event`,
  ].join("\n");
}
```

- [ ] **Step 2: Create src/formatters/index.ts**

```typescript
import type { GitHubEvent } from "../types";
import { formatFallback } from "./fallback";

type Formatter = (event: GitHubEvent) => string;

const formatters: Record<string, Formatter> = {};

export function getFormatter(eventType: string): Formatter {
  return formatters[eventType] ?? formatFallbackWrapper;
}

function formatFallbackWrapper(event: GitHubEvent): string {
  return formatFallback(event, "");
}

export function registerFormatter(eventType: string, fn: Formatter): void {
  formatters[eventType] = fn;
}
```

Wait — `formatFallbackWrapper` doesn't pass the eventType. Fix: store eventType too.

- [ ] **Step 3: Fix src/formatters/index.ts to pass event type to fallback**

Rewrite `src/formatters/index.ts`:

```typescript
import type { GitHubEvent } from "../types";
import { formatFallback } from "./fallback";

type Formatter = (event: GitHubEvent) => string;

const formatters: Record<string, Formatter> = {};

export function getFormatter(eventType: string): Formatter {
  return formatters[eventType] ?? ((event: GitHubEvent) => formatFallback(event, eventType));
}

export function registerFormatter(eventType: string, fn: Formatter): void {
  formatters[eventType] = fn;
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/formatters/fallback.ts src/formatters/index.ts
git commit -m "feat: add fallback formatter and formatter registry"
```

---

### Task 7: Push event formatter

**Files:**
- Create: `src/formatters/push.ts`

- [ ] **Step 1: Create src/formatters/push.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPush(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const ref = (event.ref as string) ?? "";
  const branch = ref.replace("refs/heads/", "");
  const commits = (event.commits as Array<{ message: string; url: string; author: { name: string } }>) ?? [];
  const sender = event.sender?.login ?? "unknown";
  const compare = (event.compare as string) ?? "";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> <b>${commits.length} new commit(s)</b> pushed to <code>${escapeHtml(branch)}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);
  lines.push("");

  const maxCommits = 5;
  for (let i = 0; i < Math.min(commits.length, maxCommits); i++) {
    const msg = commits[i].message.split("\n")[0];
    lines.push(`  <a href="${commits[i].url}"><code>${escapeHtml(commits[i].message.substring(0, 7))}</code></a> ${escapeHtml(msg)} - ${escapeHtml(commits[i].author.name)}`);
  }

  if (commits.length > maxCommits) {
    lines.push(`  ... and ${commits.length - maxCommits} more commits`);
  }

  if (compare) {
    lines.push("");
    lines.push(`<a href="${compare}">Compare</a>`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/push.ts
git commit -m "feat: add push event formatter"
```

---

### Task 8: Release event formatter

**Files:**
- Create: `src/formatters/release.ts`

- [ ] **Step 1: Create src/formatters/release.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatRelease(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const release = event.release as Record<string, unknown> | undefined;
  const action = event.action ?? "published";
  const tag = (release?.tag_name as string) ?? "";
  const name = (release?.name as string) || tag;
  const url = (release?.html_url as string) ?? "";
  const isPrerelease = release?.prerelease ?? false;
  const body = (release?.body as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  const lines: string[] = [];
  const prereleaseLabel = isPrerelease ? " [pre-release]" : "";
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Release${prereleaseLabel} <a href="${url}">${escapeHtml(name)}</a> ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 500 ? body.substring(0, 500) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/release.ts
git commit -m "feat: add release event formatter"
```

---

### Task 9: Issues event formatter

**Files:**
- Create: `src/formatters/issues.ts`

- [ ] **Step 1: Create src/formatters/issues.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatIssues(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const issue = event.issue as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (issue?.title as string) ?? "";
  const number = issue?.number;
  const url = (issue?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const state = issue?.state as string | undefined;
  const labels = (issue?.labels as Array<{ name: string }> | undefined) ?? [];

  const lines: string[] = [];
  const labelText = labels.length > 0 ? ` [${labels.map((l) => l.name).join(", ")}]` : "";

  let actionText: string;
  if (action === "opened") actionText = "opened";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else actionText = action;

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Issue <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>${labelText}`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/issues.ts
git commit -m "feat: add issues event formatter"
```

---

### Task 10: Issue comment formatter

**Files:**
- Create: `src/formatters/issue_comment.ts`

- [ ] **Step 1: Create src/formatters/issue_comment.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatIssueComment(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const issue = event.issue as Record<string, unknown> | undefined;
  const comment = event.comment as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const issueTitle = (issue?.title as string) ?? "";
  const issueNumber = issue?.number;
  const issueUrl = (issue?.html_url as string) ?? "";
  const commentUrl = (comment?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  const isPR = issueUrl.includes("/pull/");
  const typeLabel = isPR ? "PR" : "Issue";

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${action} comment on ${typeLabel} <a href="${issueUrl}">#${issueNumber} ${escapeHtml(issueTitle)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${commentUrl}">View comment</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/issue_comment.ts
git commit -m "feat: add issue comment event formatter"
```

---

### Task 11: Pull request event formatter

**Files:**
- Create: `src/formatters/pull_request.ts`

- [ ] **Step 1: Create src/formatters/pull_request.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPullRequest(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (pr?.title as string) ?? "";
  const number = pr?.number;
  const url = (pr?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const state = pr?.state as string | undefined;
  const draft = pr?.draft ?? false;
  const merged = pr?.merged ?? false;
  const labels = (pr?.labels as Array<{ name: string }> | undefined) ?? [];

  const lines: string[] = [];
  const labelText = labels.length > 0 ? ` [${labels.map((l) => l.name).join(", ")}]` : "";

  let actionText: string;
  if (action === "opened" && draft) actionText = "opened draft";
  else if (action === "opened") actionText = "opened";
  else if (action === "closed" && merged) actionText = "merged";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else if (action === "ready_for_review") actionText = "marked ready for review";
  else if (action === "converted_to_draft") actionText = "converted to draft";
  else actionText = action;

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> PR <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>${labelText}`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/pull_request.ts
git commit -m "feat: add pull request event formatter"
```

---

### Task 12: Pull request review formatter

**Files:**
- Create: `src/formatters/pull_request_review.ts`

- [ ] **Step 1: Create src/formatters/pull_request_review.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPullRequestReview(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const review = event.review as Record<string, unknown> | undefined;
  const action = event.action ?? "submitted";
  const prTitle = (pr?.title as string) ?? "";
  const prNumber = pr?.number;
  const prUrl = (pr?.html_url as string) ?? "";
  const reviewUrl = (review?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const state = review?.state as string | undefined;
  const body = (review?.body as string) ?? "";

  const lines: string[] = [];
  const stateEmoji = state === "approved" ? "✅" : state === "changes_requested" ? "❌" : "💬";
  const stateLabel = state === "approved" ? "approved" : state === "changes_requested" ? "requested changes" : "commented";

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${stateEmoji} Review ${stateLabel} on PR <a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${reviewUrl}">View review</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/pull_request_review.ts
git commit -m "feat: add pull request review event formatter"
```

---

### Task 13: Pull request review comment formatter

**Files:**
- Create: `src/formatters/pull_request_review_comment.ts`

- [ ] **Step 1: Create src/formatters/pull_request_review_comment.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPullRequestReviewComment(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const comment = event.comment as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const prTitle = (pr?.title as string) ?? "";
  const prNumber = pr?.number;
  const prUrl = (pr?.html_url as string) ?? "";
  const commentUrl = (comment?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${action} review comment on PR <a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${commentUrl}">View comment</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/pull_request_review_comment.ts
git commit -m "feat: add pull request review comment event formatter"
```

---

### Task 14: Pull request review thread formatter

**Files:**
- Create: `src/formatters/pull_request_review_thread.ts`

- [ ] **Step 1: Create src/formatters/pull_request_review_thread.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPullRequestReviewThread(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const thread = event.thread as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const prTitle = (pr?.title as string) ?? "";
  const prNumber = pr?.number;
  const prUrl = (pr?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Review thread ${action} on PR <a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/pull_request_review_thread.ts
git commit -m "feat: add pull request review thread event formatter"
```

---

### Task 15: Commit comment formatter

**Files:**
- Create: `src/formatters/commit_comment.ts`

- [ ] **Step 1: Create src/formatters/commit_comment.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCommitComment(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const comment = event.comment as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const commitId = (comment?.commit_id as string) ?? "";
  const shortCommit = commitId.substring(0, 7);
  const url = (comment?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${action} comment on commit <code>${shortCommit}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${url}">View comment</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/commit_comment.ts
git commit -m "feat: add commit comment event formatter"
```

---

### Task 16: Create and delete event formatters

**Files:**
- Create: `src/formatters/create.ts`
- Create: `src/formatters/delete.ts`

- [ ] **Step 1: Create src/formatters/create.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCreate(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const refType = (event.ref_type as string) ?? "";
  const ref = (event.ref as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Created ${refType} <code>${escapeHtml(ref)}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 2: Create src/formatters/delete.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDelete(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const refType = (event.ref_type as string) ?? "";
  const ref = (event.ref as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Deleted ${refType} <code>${escapeHtml(ref)}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/formatters/create.ts src/formatters/delete.ts
git commit -m "feat: add create and delete event formatters"
```

---

### Task 17: Discussion and discussion comment formatters

**Files:**
- Create: `src/formatters/discussion.ts`
- Create: `src/formatters/discussion_comment.ts`

- [ ] **Step 1: Create src/formatters/discussion.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDiscussion(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const discussion = event.discussion as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (discussion?.title as string) ?? "";
  const number = discussion?.number;
  const url = (discussion?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const category = (discussion?.category as { name: string } | undefined)?.name ?? "";

  let actionText = action;
  if (action === "created") actionText = "created";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else if (action === "answered") actionText = "marked as answered";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Discussion <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a> [${escapeHtml(category)}]`;
}
```

- [ ] **Step 2: Create src/formatters/discussion_comment.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDiscussionComment(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const discussion = event.discussion as Record<string, unknown> | undefined;
  const comment = event.comment as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const title = (discussion?.title as string) ?? "";
  const number = discussion?.number;
  const discussionUrl = (discussion?.html_url as string) ?? "";
  const commentUrl = (comment?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${action} comment on discussion <a href="${discussionUrl}">#${number} ${escapeHtml(title)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${commentUrl}">View comment</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/formatters/discussion.ts src/formatters/discussion_comment.ts
git commit -m "feat: add discussion event formatters"
```

---

### Task 18: Fork event formatter

**Files:**
- Create: `src/formatters/fork.ts`

- [ ] **Step 1: Create src/formatters/fork.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatFork(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const forkee = event.forkee as Record<string, unknown> | undefined;
  const forkName = (forkee?.full_name as string) ?? "";
  const forkUrl = (forkee?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Forked to <a href="${forkUrl}">${escapeHtml(forkName)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/fork.ts
git commit -m "feat: add fork event formatter"
```

---

### Task 19: Status and check run event formatters

**Files:**
- Create: `src/formatters/status.ts`
- Create: `src/formatters/check_run.ts`

- [ ] **Step 1: Create src/formatters/status.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatStatus(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sha = (event.sha as string) ?? "";
  const shortSha = sha.substring(0, 7);
  const state = (event.state as string) ?? "";
  const description = (event.description as string) ?? "";
  const targetUrl = (event.target_url as string) ?? "";

  let stateLabel: string;
  if (state === "success") stateLabel = "✅ success";
  else if (state === "failure") stateLabel = "❌ failure";
  else if (state === "pending") stateLabel = "⏳ pending";
  else stateLabel = state;

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Commit <code>${shortSha}</code> status: ${stateLabel}`);

  if (description) {
    lines.push(escapeHtml(description));
  }

  if (targetUrl) {
    lines.push(`<a href="${targetUrl}">Details</a>`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Create src/formatters/check_run.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCheckRun(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const checkRun = event.check_run as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (checkRun?.name as string) ?? "";
  const status = (checkRun?.status as string) ?? "";
  const conclusion = checkRun?.conclusion as string | undefined;
  const url = (checkRun?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  let conclusionLabel = "";
  if (conclusion === "success") conclusionLabel = " ✅";
  else if (conclusion === "failure") conclusionLabel = " ❌";
  else if (conclusion === "cancelled") conclusionLabel = " ⚠️ cancelled";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Check <a href="${url}">${escapeHtml(name)}</a> ${action}: ${status}${conclusionLabel} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/formatters/status.ts src/formatters/check_run.ts
git commit -m "feat: add status and check run event formatters"
```

---

### Task 20: Workflow run event formatter

**Files:**
- Create: `src/formatters/workflow_run.ts`

- [ ] **Step 1: Create src/formatters/workflow_run.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatWorkflowRun(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const workflowRun = event.workflow_run as Record<string, unknown> | undefined;
  const workflow = event.workflow as Record<string, unknown> | undefined;
  const action = event.action ?? "completed";
  const name = (workflowRun?.name as string) || (workflow?.name as string) || "";
  const status = workflowRun?.status as string | undefined;
  const conclusion = workflowRun?.conclusion as string | undefined;
  const url = (workflowRun?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const branch = (workflowRun?.head_branch as string) ?? "";

  let stateLabel = "";
  if (conclusion === "success") stateLabel = " ✅ success";
  else if (conclusion === "failure") stateLabel = " ❌ failure";
  else if (conclusion === "cancelled") stateLabel = " ⚠️ cancelled";
  else if (status === "in_progress") stateLabel = " ⏳ in progress";
  else if (status) stateLabel = ` (${status})`;

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Workflow <a href="${url}">${escapeHtml(name)}</a> ${action}${stateLabel}`);

  if (branch) {
    lines.push(`Branch: <code>${escapeHtml(branch)}</code>`);
  }

  lines.push(`Triggered by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  return lines.join("\n");
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/formatters/workflow_run.ts
git commit -m "feat: add workflow run event formatter"
```

---

### Task 21: Security-related event formatters (code_scanning_alert, dependabot_alert, secret_scanning_alert, secret_scanning_alert_location, repository_advisory)

**Files:**
- Create: `src/formatters/code_scanning_alert.ts`
- Create: `src/formatters/dependabot_alert.ts`
- Create: `src/formatters/secret_scanning_alert.ts`
- Create: `src/formatters/secret_scanning_alert_location.ts`
- Create: `src/formatters/repository_advisory.ts`

- [ ] **Step 1: Create src/formatters/code_scanning_alert.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCodeScanningAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const rule = (alert?.rule as { description: string } | undefined)?.description ?? "";
  const severity = (alert?.rule as { severity: string } | undefined)?.severity ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Code scanning alert <a href="${url}">${action}</a>: ${escapeHtml(rule)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 2: Create src/formatters/dependabot_alert.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDependabotAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const severity = (alert?.security_advisory as { severity: string } | undefined)?.severity ?? "";
  const summary = (alert?.security_advisory as { summary: string } | undefined)?.summary ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Dependabot alert <a href="${url}">${action}</a>: ${escapeHtml(summary)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 3: Create src/formatters/secret_scanning_alert.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSecretScanningAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const secretType = (alert?.secret_type as string) ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Secret scanning alert <a href="${url}">${action}</a>: ${escapeHtml(secretType)} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 4: Create src/formatters/secret_scanning_alert_location.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSecretScanningAlertLocation(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const secretType = (alert?.secret_type as string) ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Secret scanning alert location <a href="${url}">${action}</a>: ${escapeHtml(secretType)} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 5: Create src/formatters/repository_advisory.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatRepositoryAdvisory(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const advisory = event.repository_advisory as Record<string, unknown> | undefined;
  const action = event.action ?? "published";
  const summary = (advisory?.summary as string) ?? "";
  const severity = (advisory?.severity as string) ?? "";
  const url = (advisory?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Repository advisory <a href="${url}">${action}</a>: ${escapeHtml(summary)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/formatters/code_scanning_alert.ts src/formatters/dependabot_alert.ts src/formatters/secret_scanning_alert.ts src/formatters/secret_scanning_alert_location.ts src/formatters/repository_advisory.ts
git commit -m "feat: add security-related event formatters"
```

---

### Task 22: Package and registry package event formatters

**Files:**
- Create: `src/formatters/package.ts`
- Create: `src/formatters/registry_package.ts`

- [ ] **Step 1: Create src/formatters/package.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPackage(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pkg = event.package as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (pkg?.name as string) ?? "";
  const packageType = (pkg?.package_type as string) ?? "";
  const url = (pkg?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Package <a href="${url}">${escapeHtml(name)}</a> (${escapeHtml(packageType)}) ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 2: Create src/formatters/registry_package.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatRegistryPackage(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pkg = event.registry_package as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (pkg?.name as string) ?? "";
  const packageType = (pkg?.package_type as string) ?? "";
  const url = (pkg?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Registry package <a href="${url}">${escapeHtml(name)}</a> (${escapeHtml(packageType)}) ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/formatters/package.ts src/formatters/registry_package.ts
git commit -m "feat: add package event formatters"
```

---

### Task 23: Sponsorship, star, and sub_issues event formatters

**Files:**
- Create: `src/formatters/sponsorship.ts`
- Create: `src/formatters/star.ts`
- Create: `src/formatters/sub_issues.ts`

- [ ] **Step 1: Create src/formatters/sponsorship.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSponsorship(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sponsorship = event.sponsorship as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const sponsor = (sponsorship?.sponsor as { login: string; html_url: string } | undefined);
  const sponsorLogin = sponsor?.login ?? event.sender?.login ?? "unknown";
  const sponsorUrl = sponsor?.html_url ?? event.sender?.html_url ?? "";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 💖 Sponsorship ${action} by <a href="${sponsorUrl}">${escapeHtml(sponsorLogin)}</a>`;
}
```

- [ ] **Step 2: Create src/formatters/star.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatStar(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const action = event.action ?? "created";
  const sender = event.sender?.login ?? "unknown";
  const count = (event.repository as { stargazers_count?: number } | undefined)?.stargazers_count;

  let text = `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ⭐ Star ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
  if (count !== undefined) {
    text += ` (total: ${count})`;
  }

  return text;
}
```

- [ ] **Step 3: Create src/formatters/sub_issues.ts**

```typescript
import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSubIssues(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const issue = event.issue as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (issue?.title as string) ?? "";
  const number = issue?.number;
  const url = (issue?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Sub-issues ${action} on <a href="${url}">#${number} ${escapeHtml(title)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/formatters/sponsorship.ts src/formatters/star.ts src/formatters/sub_issues.ts
git commit -m "feat: add sponsorship, star, and sub_issues event formatters"
```

---

### Task 24: Register all formatters and create the worker entrypoint

**Files:**
- Create: `src/index.ts`
- Modify: `src/formatters/index.ts`

- [ ] **Step 1: Update src/formatters/index.ts to register all formatters**

```typescript
import type { GitHubEvent } from "../types";
import { formatFallback } from "./fallback";
import { formatPush } from "./push";
import { formatRelease } from "./release";
import { formatIssues } from "./issues";
import { formatIssueComment } from "./issue_comment";
import { formatPullRequest } from "./pull_request";
import { formatPullRequestReview } from "./pull_request_review";
import { formatPullRequestReviewComment } from "./pull_request_review_comment";
import { formatPullRequestReviewThread } from "./pull_request_review_thread";
import { formatCommitComment } from "./commit_comment";
import { formatCreate } from "./create";
import { formatDelete } from "./delete";
import { formatDiscussion } from "./discussion";
import { formatDiscussionComment } from "./discussion_comment";
import { formatFork } from "./fork";
import { formatStatus } from "./status";
import { formatWorkflowRun } from "./workflow_run";
import { formatCheckRun } from "./check_run";
import { formatCodeScanningAlert } from "./code_scanning_alert";
import { formatDependabotAlert } from "./dependabot_alert";
import { formatPackage } from "./package";
import { formatRegistryPackage } from "./registry_package";
import { formatRepositoryAdvisory } from "./repository_advisory";
import { formatSecretScanningAlert } from "./secret_scanning_alert";
import { formatSecretScanningAlertLocation } from "./secret_scanning_alert_location";
import { formatSponsorship } from "./sponsorship";
import { formatStar } from "./star";
import { formatSubIssues } from "./sub_issues";

type Formatter = (event: GitHubEvent) => string;

const formatters: Record<string, Formatter> = {
  push: formatPush,
  release: formatRelease,
  issues: formatIssues,
  issue_comment: formatIssueComment,
  pull_request: formatPullRequest,
  pull_request_review: formatPullRequestReview,
  pull_request_review_comment: formatPullRequestReviewComment,
  pull_request_review_thread: formatPullRequestReviewThread,
  commit_comment: formatCommitComment,
  create: formatCreate,
  delete: formatDelete,
  discussion: formatDiscussion,
  discussion_comment: formatDiscussionComment,
  fork: formatFork,
  status: formatStatus,
  workflow_run: formatWorkflowRun,
  check_run: formatCheckRun,
  code_scanning_alert: formatCodeScanningAlert,
  dependabot_alert: formatDependabotAlert,
  package: formatPackage,
  registry_package: formatRegistryPackage,
  repository_advisory: formatRepositoryAdvisory,
  secret_scanning_alert: formatSecretScanningAlert,
  secret_scanning_alert_location: formatSecretScanningAlertLocation,
  sponsorship: formatSponsorship,
  star: formatStar,
  sub_issues: formatSubIssues,
};

export function getFormatter(eventType: string): Formatter {
  return formatters[eventType] ?? ((event: GitHubEvent) => formatFallback(event, eventType));
}
```

- [ ] **Step 2: Create src/index.ts**

```typescript
import { verifySignature } from "./router";
import { getRepoConfig, getAdminConfig } from "./config";
import { matchTargets } from "./matcher";
import { getFormatter } from "./formatters/index";
import { sendMessage, sendAlert } from "./telegram";

export interface Env {
  CONFIG_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const eventType = request.headers.get("X-GitHub-Event") ?? "";
    const signature = request.headers.get("X-Hub-Signature-256");
    const body = await request.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const fullName = (payload.repository as { full_name?: string } | undefined)?.full_name;
    if (!fullName) {
      return new Response("Missing repository.full_name", { status: 400 });
    }

    let adminConfig;
    try {
      adminConfig = await getAdminConfig(env.CONFIG_KV);
    } catch (e) {
      console.error("Failed to read admin config:", e);
      return new Response("Internal error", { status: 500 });
    }

    const config = await getRepoConfig(env.CONFIG_KV, fullName);
    if (!config) {
      return new Response("OK", { status: 200 });
    }

    const valid = await verifySignature(body, signature, config.secret);
    if (!valid) {
      if (adminConfig) {
        try {
          await sendAlert(adminConfig, `Signature verification failed for ${fullName} (event: ${eventType})`);
        } catch {
          // ignore alert failures
        }
      }
      return new Response("Unauthorized", { status: 401 });
    }

    const isPrivate = (payload.repository as { private?: boolean } | undefined)?.private ?? false;
    const targets = matchTargets(config, eventType, isPrivate);

    const formatter = getFormatter(eventType);
    const message = formatter(payload as import("./types").GitHubEvent);

    const errors: string[] = [];
    for (const target of targets) {
      try {
        await sendMessage({
          bot_token: target.bot_token,
          chat_id: target.chat_id,
          text: message,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to send to ${target.chat_id}: ${errMsg}`);
      }
    }

    if (errors.length > 0 && adminConfig) {
      try {
        await sendAlert(adminConfig, `Telegram send errors for ${fullName} (${eventType}):\n${errors.join("\n")}`);
      } catch {
        // ignore alert failures
      }
    }

    return new Response("OK", { status: 200 });
  },
};
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/formatters/index.ts src/index.ts
git commit -m "feat: wire up worker entrypoint with all formatters"
```

---

### Task 25: Add tests and final verification

**Files:**
- Create: `test/telegram.test.ts`
- Create: `test/matcher.test.ts`
- Create: `test/formatters.test.ts`

- [ ] **Step 1: Create test/telegram.test.ts**

```typescript
import { escapeHtml } from "../src/telegram";
import { describe, it, expect } from "vitest";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
    );
  });

  it("returns plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
```

- [ ] **Step 2: Create test/matcher.test.ts**

```typescript
import { matchTargets } from "../src/matcher";
import { describe, it, expect } from "vitest";
import type { RepoConfig } from "../src/types";

const baseConfig: RepoConfig = {
  secret: "test",
  targets: [
    {
      bot_token: "token1",
      chat_id: "-100",
      events: ["push", "issues"],
      public: false,
    },
    {
      bot_token: "token2",
      chat_id: "@channel",
      events: ["push", "release"],
      public: true,
    },
  ],
};

describe("matchTargets", () => {
  it("matches event type for non-public targets", () => {
    const result = matchTargets(baseConfig, "push", false);
    expect(result).toHaveLength(2);
  });

  it("filters public targets for private repos", () => {
    const result = matchTargets(baseConfig, "push", true);
    expect(result).toHaveLength(1);
    expect(result[0].bot_token).toBe("token1");
  });

  it("filters sensitive events for public targets", () => {
    const result = matchTargets(baseConfig, "dependabot_alert", false);
    expect(result).toHaveLength(1);
    expect(result[0].bot_token).toBe("token1");
  });

  it("returns empty array when no targets match event", () => {
    const result = matchTargets(baseConfig, "star", false);
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Create test/formatters.test.ts**

```typescript
import { formatFallback } from "../src/formatters/fallback";
import { formatPush } from "../src/formatters/push";
import { formatRelease } from "../src/formatters/release";
import { formatIssues } from "../src/formatters/issues";
import { describe, it, expect } from "vitest";
import type { GitHubEvent } from "../src/types";

const baseEvent: GitHubEvent = {
  repository: {
    full_name: "owner/repo",
    private: false,
    html_url: "https://github.com/owner/repo",
    name: "repo",
    owner: { login: "owner" },
  },
  sender: {
    login: "testuser",
    html_url: "https://github.com/testuser",
  },
};

describe("formatFallback", () => {
  it("formats unknown event", () => {
    const result = formatFallback(baseEvent, "custom_event");
    expect(result).toContain("owner/repo");
    expect(result).toContain("custom_event");
  });
});

describe("formatPush", () => {
  it("formats push with commits", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      ref: "refs/heads/main",
      compare: "https://github.com/owner/repo/compare/abc...def",
      commits: [
        { message: "fix: bug", url: "https://github.com/owner/repo/commit/abc", author: { name: "dev" } },
      ],
    };
    const result = formatPush(event);
    expect(result).toContain("main");
    expect(result).toContain("fix: bug");
    expect(result).toContain("1 new commit");
  });
});

describe("formatRelease", () => {
  it("formats release", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "published",
      release: {
        tag_name: "v1.0.0",
        name: "v1.0.0",
        html_url: "https://github.com/owner/repo/releases/tag/v1.0.0",
        prerelease: false,
        body: "Release notes here",
      },
    };
    const result = formatRelease(event);
    expect(result).toContain("v1.0.0");
    expect(result).toContain("published");
    expect(result).toContain("Release notes here");
  });

  it("marks pre-release", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "published",
      release: {
        tag_name: "v2.0.0-beta",
        name: "v2.0.0-beta",
        html_url: "https://github.com/owner/repo/releases/tag/v2.0.0-beta",
        prerelease: true,
        body: "",
      },
    };
    const result = formatRelease(event);
    expect(result).toContain("[pre-release]");
  });
});

describe("formatIssues", () => {
  it("formats opened issue", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "opened",
      issue: {
        title: "Bug report",
        number: 42,
        html_url: "https://github.com/owner/repo/issues/42",
        labels: [{ name: "bug" }],
      },
    };
    const result = formatIssues(event);
    expect(result).toContain("#42");
    expect(result).toContain("Bug report");
    expect(result).toContain("opened");
    expect(result).toContain("[bug]");
  });
});
```

- [ ] **Step 4: Install vitest and run tests**

Run:
```bash
npm install -D vitest
npx vitest run
```
Expected: all tests pass

- [ ] **Step 5: Add test script to package.json**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Edit `package.json` to add test scripts.

- [ ] **Step 6: Run tests again**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add test/ package.json
git commit -m "test: add unit tests for core modules and formatters"
```
