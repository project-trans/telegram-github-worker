import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCodeScanningAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const rule = (alert?.rule as { description: string } | undefined)?.description ?? "";
  const severity = (alert?.rule as { severity: string } | undefined)?.severity ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Code scanning alert <a href="${url}">${action}</a>: ${escapeHtml(rule)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
