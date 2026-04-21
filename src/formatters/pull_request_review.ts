import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatPullRequestReview(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const review = event.review as Record<string, unknown> | undefined;
  const action = event.action ?? "submitted";
  const prTitle = (pr?.title as string) ?? "";
  const prNumber = pr?.number;
  const prUrl = (pr?.html_url as string) ?? "";
  const reviewUrl = (review?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const state = review?.state as string | undefined;
  const body = (review?.body as string) ?? "";

  const stateLabel = state === "approved" ? "approved" : state === "changes_requested" ? "requested changes" : "commented";
  const emoji = state === "approved" ? "✅" : state === "changes_requested" ? "❌" : "👀";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `${emoji} pull_request_review`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("PR:       ", `<a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a>`));
  lines.push(headerLine("Action:   ", stateLabel));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  lines.push("");

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push(escapeHtml(truncated));
    lines.push("");
  }

  lines.push(`<a href="${reviewUrl}">View review</a>`);

  return lines.join("\n");
}
