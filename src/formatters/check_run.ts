import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

export function formatCheckRun(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const checkRun = event.check_run as Record<string, unknown> | undefined;
  const action = event.action ?? "updated";
  const name = (checkRun?.name as string) ?? "";
  const status = (checkRun?.status as string) ?? "";
  const conclusion = checkRun?.conclusion as string | undefined;
  const url = (checkRun?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const senderUrl = event.sender?.html_url ?? "";

  let conclusionLabel = "";
  let emoji = "⚠️";
  if (conclusion === "success") { conclusionLabel = "success"; emoji = "✅"; }
  else if (conclusion === "failure") { conclusionLabel = "failure"; emoji = "❌"; }
  else if (conclusion === "cancelled") conclusionLabel = "cancelled";

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `${emoji} check_run`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Check:    ", `<a href="${url}">${escapeHtml(name)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("Status:   ", status + (conclusionLabel ? ` (${conclusionLabel})` : "")));
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
