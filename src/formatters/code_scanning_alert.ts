import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatCodeScanningAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const rule = (alert?.rule as { description: string } | undefined)?.description ?? "";
  const severity = (alert?.rule as { severity: string } | undefined)?.severity ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🔒 code_scanning_alert"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("Rule:     ", `<a href="${url}">${escapeHtml(rule)}</a>`));
  lines.push(headerLine("Severity: ", severity));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
