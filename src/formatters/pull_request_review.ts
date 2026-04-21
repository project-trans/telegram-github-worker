import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

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
  const state = review?.state as string | undefined;
  const body = (review?.body as string) ?? "";

  const lines: string[] = [];
  const stateEmoji = state === "approved" ? "✅" : state === "changes_requested" ? "❌" : "💬";
  const stateLabel = state === "approved" ? "approved" : state === "changes_requested" ? "requested changes" : "commented";

  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> ${stateEmoji} Review ${stateLabel} on PR <a href="${prUrl}">#${prNumber} ${escapeHtml(prTitle)}</a> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  if (body) {
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push("");
    lines.push(escapeHtml(truncated));
  }

  lines.push("");
  lines.push(`<a href="${reviewUrl}">View review</a>`);

  return lines.join("\n");
}
