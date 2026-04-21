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
