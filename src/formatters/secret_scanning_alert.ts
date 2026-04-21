import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatSecretScanningAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const secretType = (alert?.secret_type as string) ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🔒 secret_scanning_alert"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("Type:     ", `<a href="${url}">${escapeHtml(secretType)}</a>`));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
