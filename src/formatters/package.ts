import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPackage(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pkg = event.package as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (pkg?.name as string) ?? "";
  const packageType = (pkg?.package_type as string) ?? "";
  const url = (pkg?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Package <a href="${url}">${escapeHtml(name)}</a> (${escapeHtml(packageType)}) ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
