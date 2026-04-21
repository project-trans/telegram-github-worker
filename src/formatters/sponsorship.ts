import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatSponsorship(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sponsorship = event.sponsorship as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const sponsor = (sponsorship?.sponsor as { login: string; html_url: string } | undefined);
  const sponsorLogin = sponsor?.login ?? event.sender?.login ?? "unknown";
  const sponsorUrl = sponsor?.html_url ?? event.sender?.html_url ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "💖 sponsorship"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("By:       ", `<a href="${sponsorUrl}">${escapeHtml(sponsorLogin)}</a>`));

  return lines.join("\n");
}
