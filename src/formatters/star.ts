import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatStar(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const action = event.action ?? "created";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const count = (event.repository as { stargazers_count?: number } | undefined)?.stargazers_count;

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "⭐ star"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  if (count !== undefined) {
    lines.push(headerLine("Stars:    ", `${count}`));
  }
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
