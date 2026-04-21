import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

export function formatWorkflowRun(event: GitHubEvent): string {
  const repo = event.repository?.full_name ?? "unknown";
  const repoUrl = event.repository?.html_url ?? "";
  const workflowRun = event.workflow_run as Record<string, unknown> | undefined;
  const workflow = event.workflow as Record<string, unknown> | undefined;
  const action = event.action ?? "completed";
  const name = (workflowRun?.name as string) || (workflow?.name as string) || "";
  const status = workflowRun?.status as string | undefined;
  const conclusion = workflowRun?.conclusion as string | undefined;
  const url = (workflowRun?.html_url as string) ?? "";
  const sender = event.sender?.login ?? "unknown";
  const branch = (workflowRun?.head_branch as string) ?? "";

  let stateLabel = "";
  if (conclusion === "success") stateLabel = " ✅ success";
  else if (conclusion === "failure") stateLabel = " ❌ failure";
  else if (conclusion === "cancelled") stateLabel = " ⚠️ cancelled";
  else if (status === "in_progress") stateLabel = " ⏳ in progress";
  else if (status) stateLabel = ` (${status})`;

  const lines: string[] = [];
  lines.push(`<b>[<a href="${repoUrl}">${escapeHtml(repo)}</a>]</b> Workflow <a href="${url}">${escapeHtml(name)}</a> ${action}${stateLabel}`);

  if (branch) {
    lines.push(`Branch: <code>${escapeHtml(branch)}</code>`);
  }

  lines.push(`Triggered by <a href="${event.sender?.html_url ?? ""}">${escapeHtml(sender)}</a>`);

  return lines.join("\n");
}
