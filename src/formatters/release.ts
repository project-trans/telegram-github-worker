import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatRelease(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const release = event.release as Record<string, unknown> | undefined;
  const action = event.action ?? "published";
  const tag = (release?.tag_name as string) ?? "";
  const name = (release?.name as string) || tag;
  const url = (release?.html_url as string) ?? "";
  const isPrerelease = release?.prerelease ?? false;
  const body = (release?.body as string) ?? "";
  const sender = event.sender?.login ?? "unknown";

  const lines: string[] = [];
  const prereleaseLabel = isPrerelease ? " [pre-release]" : "";
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Release${prereleaseLabel} <a href="${url}">${escapeHtml(name)}</a> ${action} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 500 ? body.substring(0, 500) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  return lines.join("\n");
}
