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
