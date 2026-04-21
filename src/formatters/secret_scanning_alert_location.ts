import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSecretScanningAlertLocation(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const alert = event.alert as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const secretType = (alert?.secret_type as string) ?? "";
  const url = (alert?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Secret scanning alert location <a href="${url}">${action}</a>: ${escapeHtml(secretType)} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
