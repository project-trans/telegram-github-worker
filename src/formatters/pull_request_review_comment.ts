import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

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
  const senderUrl = event.sender?.html_url ?? "";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "💬 pull_request_review_comment"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("PR:       ", `<a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  lines.push("");

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push(escapeHtml(truncated));
    lines.push("");
  }

  lines.push(`<a href="${commentUrl}">View comment</a>`);

  return lines.join("\n");
}
