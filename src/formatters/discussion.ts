import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatDiscussion(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const discussion = event.discussion as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (discussion?.title as string) ?? "";
  const number = discussion?.number;
  const url = (discussion?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const category = (discussion?.category as { name: string } | undefined)?.name ?? "";

  let actionText = action;
  if (action === "created") actionText = "created";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else if (action === "answered") actionText = "marked as answered";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "💡 discussion"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Title:    ", `<a href="${url}">#${number} ${escapeHtml(title)}</a>`));
  lines.push(headerLine("Action:   ", actionText));
  lines.push(headerLine("Category: ", escapeHtml(category)));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
