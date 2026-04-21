import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatCreate(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const refType = (event.ref_type as string) ?? "";
  const ref = (event.ref as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Created ${refType} <code>${escapeHtml(ref)}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
