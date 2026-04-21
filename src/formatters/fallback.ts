import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatFallback(event: GitHubEvent, eventType: string): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const action = event.action ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `ℹ️ ${eventType}`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  if (action) {
    lines.push(headerLine("Action:   ", action));
  }

  return lines.join("\n");
}
