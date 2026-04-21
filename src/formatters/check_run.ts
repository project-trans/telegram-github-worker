import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

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

  let conclusionLabel = "";
  if (conclusion === "success") conclusionLabel = " ✅";
  else if (conclusion === "failure") conclusionLabel = " ❌";
  else if (conclusion === "cancelled") conclusionLabel = " ⚠️ cancelled";

  return `<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Check <a href="${url}">${escapeHtml(name)}</a> ${action}: ${status}${conclusionLabel} by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`;
}
