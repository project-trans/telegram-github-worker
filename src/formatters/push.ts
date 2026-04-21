import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatPush(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const ref = (event.ref as string) ?? "";
  const branch = ref.replace("refs/heads/", "");
  const commits = (event.commits as Array<{ message: string; url: string; author: { name: string } }>) ?? [];
  const sender = event.sender?.login ?? "unknown";
  const compare = (event.compare as string) ?? "";

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> <b>${commits.length} new commit(s)</b> pushed to <code>${escapeHtml(branch)}</code> by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);
  lines.push("");

  const maxCommits = 5;
  for (let i = 0; i < Math.min(commits.length, maxCommits); i++) {
    const msg = commits[i].message.split("\n")[0];
    lines.push(`  <a href="${commits[i].url}"><code>${escapeHtml(commits[i].message.substring(0, 7))}</code></a> ${escapeHtml(msg)} - ${escapeHtml(commits[i].author.name)}`);
  }

  if (commits.length > maxCommits) {
    lines.push(`  ... and ${commits.length - maxCommits} more commits`);
  }

  if (compare) {
    lines.push("");
    lines.push(`<a href="${compare}">Compare</a>`);
  }

  return lines.join("\n");
}
