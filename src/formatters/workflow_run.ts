import type { GitHubEvent } from "../types";
import { escapeHtml } from "../telegram";

function headerLine(label: string, value: string): string {
  return `<code><b>${label}</b></code>${value}`;
}

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
  const senderUrl = event.sender?.html_url ?? "";
  const branch = (workflowRun?.head_branch as string) ?? "";

  let stateLabel = "";
  let emoji = "⚙️";
  if (conclusion === "success") { stateLabel = "success"; emoji = "⚙️ ✅"; }
  else if (conclusion === "failure") { stateLabel = "failure"; emoji = "⚙️ ❌"; }
  else if (conclusion === "cancelled") stateLabel = "cancelled";
  else if (status === "in_progress") stateLabel = "in progress";
  else if (status) stateLabel = status;

  const lines: string[] = [];
  lines.push(headerLine("Event:    ", `${emoji} workflow_run`));
  lines.push(headerLine("Repo:     ", `<a href="${repoUrl}">${escapeHtml(repo)}</a>`));
  lines.push(headerLine("Workflow: ", `<a href="${url}">${escapeHtml(name)}</a>`));
  lines.push(headerLine("Action:   ", action));
  lines.push(headerLine("Status:   ", stateLabel));
  if (branch) {
    lines.push(headerLine("Branch:   ", `<code>${escapeHtml(branch)}</code>`));
  }
  lines.push(headerLine("By:       ", `<a href="${senderUrl}">${escapeHtml(sender)}</a>`));

  return lines.join("\n");
}
