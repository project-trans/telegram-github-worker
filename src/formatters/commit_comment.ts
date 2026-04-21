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
