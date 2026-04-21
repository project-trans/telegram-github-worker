import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

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
  const senderUrl = event.sender?.html_url ?? "";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  const isPR = issue?.pull_request !== undefined;
  const typeLabel = isPR ? "pr_comment" : "issue_comment";

  lines.push(headerLine("Event:    ", `💬 ${typeLabel}`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  lines.push("");
  lines.push(`<a href="${issueUrl}">#${issueNumber} ${escapeHtml(issueTitle)}</a>`);

  if (body) {
    lines.push("");
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${commentUrl}">View comment</a>`);

  return lines.join("\n");
}
