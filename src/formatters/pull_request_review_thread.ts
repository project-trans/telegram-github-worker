import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatPullRequestReviewThread(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const prTitle = (pr?.title as string) ?? "";
  const prNumber = pr?.number;
  const prUrl = (pr?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🧵 pull_request_review_thread"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("PR:       ", `<a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
