import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatFork(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const forkee = event.forkee as Record<string, unknown> | undefined;
  const forkName = (forkee?.full_name as string) ?? "";
  const forkUrl = (forkee?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Forked to <a href="${forkUrl}">${escapeHtml(forkName)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
