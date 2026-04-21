import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatCommitComment(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const comment = event.comment as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const commitId = (comment?.commit_id as string) ?? "";
  const shortCommit = commitId.substring(0, 7);
  const url = (comment?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const body = (comment?.body as string) ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "💬 commit_comment"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Commit:   ", `<code>${shortCommit}</code>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  lines.push("");

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push(escapeHtml(truncated));
    lines.push("");
  }

  lines.push(`<a href="${url}">View comment</a>`);

  return lines.join("\n");
}
