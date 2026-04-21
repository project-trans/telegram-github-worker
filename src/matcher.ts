import type { Target, RepoConfig } from "./types";

const PUBLIC_SAFE_EVENTS = new Set([
  "check_run",
  "commit_comment",
  "create",
  "delete",
  "discussion",
  "discussion_comment",
  "fork",
  "issue_comment",
  "issues",
  "package",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
  "pull_request_review_thread",
  "push",
  "registry_package",
  "release",
  "sponsorship",
  "star",
  "status",
  "sub_issues",
  "workflow_run",
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
    const matches = target.events.includes("*") || target.events.includes(eventType);
    if (!matches) continue;

    if (target.public) {
      if (isPrivate) continue;
      if (!PUBLIC_SAFE_EVENTS.has(eventType)) continue;
    }

    results.push(target);
  }

  return results;
}
