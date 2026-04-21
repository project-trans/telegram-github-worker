import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDependabotAlert(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const severity = (alert?.security_advisory as { severity: string } | undefined)?.severity ?? "";
  const summary = (alert?.security_advisory as { summary: string } | undefined)?.summary ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Dependabot alert <a href="${url}">${action}</a>: ${escapeHtml(summary)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
