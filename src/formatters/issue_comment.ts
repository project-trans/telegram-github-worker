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
  const isPR = issue?.pull_request !== undefined;
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
