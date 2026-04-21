import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatRegistryPackage(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pkg = event.registry_package as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (pkg?.name as string) ?? "";
  const packageType = (pkg?.package_type as string) ?? "";
  const url = (pkg?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "📦 registry_package"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Package:  ", `<a href="${url}">${escapeHtml(name)}</a>`));
  lines.push(headerLine("Type:     ", escapeHtml(packageType)));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
