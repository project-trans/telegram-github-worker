import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatPullRequest(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const pr = event.pull_request as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const title = (pr?.title as string) ?? "";
  const number = pr?.number;
  const url = (pr?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const draft = pr?.draft ?? false;
  const merged = pr?.merged ?? false;
  const labels = (pr?.labels as Array<{ name: string }> | undefined) ?? [];
  const headLabel = ((pr?.head as Record<string, unknown> | undefined)?.label as string) ?? "";
  const baseLabel = ((pr?.base as Record<string, unknown> | undefined)?.label as string) ?? "";
  const commits = pr?.commits as number | undefined;
  const additions = pr?.additions as number | undefined;
  const deletions = pr?.deletions as number | undefined;

  let actionText: string;
  let emoji = "🔀";
  if (action === "opened" && draft) actionText = "opened draft";
  else if (action === "opened") actionText = "opened";
  else if (action === "closed" && merged) { actionText = "merged"; emoji = "🎉"; }
  else if (action === "closed") { actionText = "closed"; emoji = "❌"; }
  else if (action === "reopened") actionText = "reopened";
  else if (action === "ready_for_review") actionText = "ready for review";
  else if (action === "converted_to_draft") actionText = "converted to draft";
  else if (action === "review_requested") actionText = "review requested";
  else if (action === "synchronize") actionText = "synchronized";
  else actionText = action;

  const requestedReviewers = action === "review_requested"
    ? (event.requested_reviewer as { login: string } | undefined) ?? (pr?.requested_reviewers as Array<{ login: string }> | undefined)
    : undefined;

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `${emoji} pull_request`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Number:   ", `#${number}`));
  lines.push(headerLine("Title:    ", `<a href="${url}">${escapeHtml(title)}</a>`));
  lines.push(headerLine("Action:   ", actionText));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  if (headLabel && baseLabel) {
    lines.push(headerLine("Branch:   ", `${escapeHtml(headLabel)} → ${escapeHtml(baseLabel)}`));
  }
  if (commits !== undefined) {
    lines.push(headerLine("Commits:  ", `${commits}`));
  }
  if (additions !== undefined && deletions !== undefined) {
    lines.push(headerLine("Diff:     ", `+${additions} -${deletions}`));
  }
  if (labels.length > 0) {
    lines.push(headerLine("Labels:   ", labels.map((l) => escapeHtml(l.name)).join(", ")));
  }
  if (action === "review_requested" && requestedReviewers) {
    const reviewers = Array.isArray(requestedReviewers)
      ? requestedReviewers.map((r) => escapeHtml(r.login)).join(", ")
      : escapeHtml(requestedReviewers.login);
    lines.push(headerLine("Reviewer: ", reviewers));
  }
  const body = (pr?.body as string) ?? "";
  if (body) {
    lines.push("");
    const truncated = body.length > 300 ? body.substring(0, 300) + "..." : body;
    lines.push(escapeHtml(truncated));
  }
  if (action === "synchronize") {
    const before = (event.before as string) ?? "";
    const after = (event.after as string) ?? "";
    if (before && after) {
      const compareUrl = `${repoUrl}/compare/${before.substring(0, 7)}...${after.substring(0, 7)}`;
      lines.push("");
      lines.push(`<a href="${compareUrl}">Compare changes</a>`);
    }
  }

  return lines.join("\n");
}
