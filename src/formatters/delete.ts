import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatDelete(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const refType = (event.ref_type as string) ?? "";
  const ref = (event.ref as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "➖ delete"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Type:     ", refType));
  lines.push(headerLine("Ref:      ", `<code>${escapeHtml(ref)}</code>`));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
