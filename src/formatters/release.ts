import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

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
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  const typeLabel = isPrerelease ? "📦 release (pre-release)" : "📦 release";
  lines.push(headerLine("Event:    ", typeLabel));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Tag:      ", `<a href="${url}">${escapeHtml(name)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  if (body) {
    lines.push("");
    const truncated = body.length > 500 ? body.substring(0, 500) + "..." : body;
    lines.push(escapeHtml(truncated));
  }

  return lines.join("\n");
}
