import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatPush(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const ref = (event.ref as string) ?? "";
  const branch = ref.replace("refs/heads/", "");
  const commits = (event.commits as Array<{ id: string; message: string; url: string; author: { name: string } }>) ?? [];
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";
  const compare = (event.compare as string) ?? "";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", "🚀 push"));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Branch:   ", `<code>${escapeHtml(branch)}</code>`));
  lines.push(headerLine("Commits:  ", `${commits.length}`));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));
  lines.push("");

  const maxCommits = 5;
  for (let i = 0; i < Math.min(commits.length, maxCommits); i++) {
    const msg = commits[i].message.split("\n")[0];
    lines.push(`<a href="${commits[i].url}"><code>${escapeHtml(commits[i].id.substring(0, 7))}</code></a> ${escapeHtml(msg)} - ${escapeHtml(commits[i].author.name)}`);
  }

  if (commits.length > maxCommits) {
    lines.push(`... and ${commits.length - maxCommits} more commits`);
  }

  if (compare) {
    lines.push("");
    lines.push(`<a href="${compare}">Compare</a>`);
  }

  return lines.join("\n");
}
