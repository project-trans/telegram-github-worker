import { formatFallback } from "../src/formatters/fallback";
import { formatPush } from "../src/formatters/push";
import { formatRelease } from "../src/formatters/release";
import { formatIssues } from "../src/formatters/issues";
import { describe, it, expect } from "vitest";
import type { GitHubEvent } from "../src/types";

const baseEvent: GitHubEvent = {
  repository: {
    full_name: "owner/repo",
    private: false,
    html_url: "https://github.com/owner/repo",
    name: "repo",
    owner: { login: "owner" },
  },
  sender: {
    login: "testuser",
    html_url: "https://github.com/testuser",
  },
};

describe("formatFallback", () => {
  it("formats unknown event", () => {
    const result = formatFallback(baseEvent, "custom_event");
    expect(result).toContain("owner/repo");
    expect(result).toContain("custom_event");
  });
});

describe("formatPush", () => {
  it("formats push with commits", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      ref: "refs/heads/main",
      compare: "https://github.com/owner/repo/compare/abc...def",
      commits: [
        { message: "fix: bug", url: "https://github.com/owner/repo/commit/abc", author: { name: "dev" } },
      ],
    };
    const result = formatPush(event);
    expect(result).toContain("main");
    expect(result).toContain("fix: bug");
    expect(result).toContain("1 new commit");
  });
});

describe("formatRelease", () => {
  it("formats release", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "published",
      release: {
        tag_name: "v1.0.0",
        name: "v1.0.0",
        html_url: "https://github.com/owner/repo/releases/tag/v1.0.0",
        prerelease: false,
        body: "Release notes here",
      },
    };
    const result = formatRelease(event);
    expect(result).toContain("v1.0.0");
    expect(result).toContain("published");
    expect(result).toContain("Release notes here");
  });

  it("marks pre-release", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "published",
      release: {
        tag_name: "v2.0.0-beta",
        name: "v2.0.0-beta",
        html_url: "https://github.com/owner/repo/releases/tag/v2.0.0-beta",
        prerelease: true,
        body: "",
      },
    };
    const result = formatRelease(event);
    expect(result).toContain("[pre-release]");
  });
});

describe("formatIssues", () => {
  it("formats opened issue", () => {
    const event: GitHubEvent = {
      ...baseEvent,
      action: "opened",
      issue: {
        title: "Bug report",
        number: 42,
        html_url: "https://github.com/owner/repo/issues/42",
        labels: [{ name: "bug" }],
      },
    };
    const result = formatIssues(event);
    expect(result).toContain("#42");
    expect(result).toContain("Bug report");
    expect(result).toContain("opened");
    expect(result).toContain("[bug]");
  });
});
