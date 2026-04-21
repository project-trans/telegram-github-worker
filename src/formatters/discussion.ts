import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatDiscussion(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const discussion = event.discussion as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (discussion?.title as string) ?? "";
  const number = discussion?.number;
  const url = (discussion?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const category = (discussion?.category as { name: string } | undefined)?.name ?? "";

  let actionText = action;
  if (action === "created") actionText = "created";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else if (action === "answered") actionText = "marked as answered";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Discussion <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a> [${escapeHtml(category)}]`;
}
