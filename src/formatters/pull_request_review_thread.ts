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
