import type { GitHubEvent } from "../types";
import { formatFallback } from "./fallback";
import { formatPush } from "./push";
import { formatRelease } from "./release";
import { formatIssues } from "./issues";
import { formatIssueComment } from "./issue_comment";
import { formatPullRequest } from "./pull_request";
import { formatPullRequestReview } from "./pull_request_review";
import { formatPullRequestReviewComment } from "./pull_request_review_comment";
import { formatPullRequestReviewThread } from "./pull_request_review_thread";
import { formatCommitComment } from "./commit_comment";
import { formatCreate } from "./create";
import { formatDelete } from "./delete";
import { formatDiscussion } from "./discussion";
import { formatDiscussionComment } from "./discussion_comment";
import { formatFork } from "./fork";
import { formatStatus } from "./status";
import { formatWorkflowRun } from "./workflow_run";
import { formatCheckRun } from "./check_run";
import { formatCodeScanningAlert } from "./code_scanning_alert";
import { formatDependabotAlert } from "./dependabot_alert";
import { formatPackage } from "./package";
import { formatRegistryPackage } from "./registry_package";
import { formatRepositoryAdvisory } from "./repository_advisory";
import { formatSecretScanningAlert } from "./secret_scanning_alert";
import { formatSecretScanningAlertLocation } from "./secret_scanning_alert_location";
import { formatSponsorship } from "./sponsorship";
import { formatStar } from "./star";
import { formatSubIssues } from "./sub_issues";

type Formatter = (event: GitHubEvent) => string;

const formatters: Record<string, Formatter> = {
  push: formatPush,
  release: formatRelease,
  issues: formatIssues,
  issue_comment: formatIssueComment,
  pull_request: formatPullRequest,
  pull_request_review: formatPullRequestReview,
  pull_request_review_comment: formatPullRequestReviewComment,
  pull_request_review_thread: formatPullRequestReviewThread,
  commit_comment: formatCommitComment,
  create: formatCreate,
  delete: formatDelete,
  discussion: formatDiscussion,
  discussion_comment: formatDiscussionComment,
  fork: formatFork,
  status: formatStatus,
  workflow_run: formatWorkflowRun,
  check_run: formatCheckRun,
  code_scanning_alert: formatCodeScanningAlert,
  dependabot_alert: formatDependabotAlert,
  package: formatPackage,
  registry_package: formatRegistryPackage,
  repository_advisory: formatRepositoryAdvisory,
  secret_scanning_alert: formatSecretScanningAlert,
  secret_scanning_alert_location: formatSecretScanningAlertLocation,
  sponsorship: formatSponsorship,
  star: formatStar,
  sub_issues: formatSubIssues,
};

export function getFormatter(eventType: string): Formatter {
  return formatters[eventType] ?? ((event: GitHubEvent) => formatFallback(event, eventType));
}
