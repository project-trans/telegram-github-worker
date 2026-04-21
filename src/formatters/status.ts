import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatStatus(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sha = (event.sha as string) ?? "";
  const shortSha = sha.substring(0, 7);
  const state = (event.state as string) ?? "";
  const description = (event.description as string) ?? "";
  const targetUrl = (event.target_url as string) ?? "";

  let stateLabel: string;
  if (state === "success") stateLabel = "success";
  else if (state === "failure") stateLabel = "failure";
  else if (state === "pending") stateLabel = "pending";
  else stateLabel = state;

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🔧 status"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Commit:   ", `<code>${shortSha}</code>`));
  lines.push(headerLine("State:    ", stateLabel));
  lines.push("");

  if (description) {
    lines.push(escapeHtml(description));
    lines.push("");
  }

  if (targetUrl) {
    lines.push(`<a href="${targetUrl}">Details</a>`);
  }

  return lines.join("\n");
}
