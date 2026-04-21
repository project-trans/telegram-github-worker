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
