import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatRepositoryAdvisory(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const advisory = event.repository_advisory as Record<string, unknown> | undefined;
  const action = event.action ?? "published";
  const summary = (advisory?.summary as string) ?? "";
  const severity = (advisory?.severity as string) ?? "";
  const url = (advisory?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 🔒 Repository advisory <a href="${url}">${action}</a>: ${escapeHtml(summary)} (${severity}) by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
