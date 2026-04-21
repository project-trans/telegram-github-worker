import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatRepositoryAdvisory(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const advisory = event.repository_advisory as Record<string, unknown> | undefined;
  const action = event.action ?? "published";
  const summary = (advisory?.summary as string) ?? "";
  const severity = (advisory?.severity as string) ?? "";
  const url = (advisory?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🔒 repository_advisory"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("Summary:  ", `<a href="${url}">${escapeHtml(summary)}</a>`));
  lines.push(headerLine("Severity: ", severity));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
