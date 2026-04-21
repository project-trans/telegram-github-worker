import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPullRequest(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (pr?.title as string) ?? "";
  const number = pr?.number;
  const url = (pr?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const draft = pr?.draft ?? false;
  const merged = pr?.merged ?? false;
  const labels = (pr?.labels as Array<{ name: string }> | undefined) ?? [];

  const lines: string[] = [];
  const labelText = labels.length > 0 ? ` [${labels.map((l) => l.name).join(", ")}]` : "";

  let actionText: string;
  if (action === "opened" && draft) actionText = "opened draft";
  else if (action === "opened") actionText = "opened";
  else if (action === "closed" && merged) actionText = "merged";
  else if (action === "closed") actionText = "closed";
  else if (action === "reopened") actionText = "reopened";
  else if (action === "ready_for_review") actionText = "marked ready for review";
  else if (action === "converted_to_draft") actionText = "converted to draft";
  else actionText = action;

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> PR <a href="${url}">#${number} ${escapeHtml(title)}</a> ${actionText} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>${labelText}`);

  return lines.join("\n");
}
