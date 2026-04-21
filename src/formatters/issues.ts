import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatIssues(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const issue = event.issue as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (issue?.title as string) ?? "";
  const number = issue?.number;
  const url = (issue?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const labels = (issue?.labels as Array<{ name: string }> | undefined) ?? [];

  let actionText: string;
  let emoji = "📝";
  if (action === "opened") { actionText = "opened"; emoji = "🐛"; }
  else if (action === "closed") { actionText = "closed"; emoji = "✅"; }
  else if (action === "reopened") { actionText = "reopened"; emoji = "🔄"; }
  else actionText = action;

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `${emoji} issue`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", actionText));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  if (labels.length > 0) {
    lines.push(headerLine("Labels:   ", labels.map((l) => escapeHtml(l.name)).join(", ")));
  }
  lines.push("");
  lines.push(`<a href="${url}">#${number} ${escapeHtml(title)}</a>`);

  return lines.join("\n");
}
