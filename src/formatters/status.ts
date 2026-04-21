import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatStatus(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sha = (event.sha as string) ?? "";
  const shortSha = sha.substring(0, 7);
  const state = (event.state as string) ?? "";
  const description = (event.description as string) ?? "";
  const targetUrl = (event.target_url as string) ?? "";

  let stateLabel: string;
  if (state === "success") stateLabel = "✅ success";
  else if (state === "failure") stateLabel = "❌ failure";
  else if (state === "pending") stateLabel = "⏳ pending";
  else stateLabel = state;

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Commit <code>${shortSha}</code> status: ${stateLabel}`);

  if (description) {
    lines.push(escapeHtml(description));
  }

  if (targetUrl) {
    lines.push(`<a href="${targetUrl}">Details</a>`);
  }

  return lines.join("\n");
}
