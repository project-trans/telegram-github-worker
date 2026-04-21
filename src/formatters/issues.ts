import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatIssues(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const issue = event.issue as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (issue?.title as string) ?? "";
  const number = issue?.number;
  const url = (issue?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const labels = (issue?.labels as Array<{ name: string }> | undefined) ?? [];

  const lines: string[] = [];
  const labelText = labels.length > 0 ? ` [${labels.map((l) => l.name).join(", ")}]` : "";

  let actionText: string;
  if (action === "opened") actionText = "opened";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else actionText = action;

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Issue <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>${labelText}`);

  return lines.join("\n");
}
