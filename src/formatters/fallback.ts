import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatFallback(event: GitHubEvent, eventType: string): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const action = event.action ? ` ${event.action}` : "";

  return [
    `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b>`,
    `${eventType}${action} event`,
  ].join("\n");
}
