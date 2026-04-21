import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatSponsorship(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const sponsorship = event.sponsorship as Record<string, unknown> | undefined;
  const action = event.action ?? "created";
  const sponsor = (sponsorship?.sponsor as { login: string; html_url: string } | undefined);
  const sponsorLogin = sponsor?.login ?? event.sender?.login ?? "unknown";
  const sponsorUrl = sponsor?.html_url ?? event.sender?.html_url ?? "";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> 💖 Sponsorship ${action} by <a href="${sponsorUrl}">${escapeHtml(sponsorLogin)}</a>`;
}
