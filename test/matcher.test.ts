import { matchTargets } from "../src/matcher";
import { describe, it, expect } from "vitest";
import type { RepoConfig } from "../src/types";

const baseConfig: RepoConfig = {
  secret: "test",
  targets: [
    {
      bot_token: "token1",
      chat_id: "-100",
      events: ["push", "issues", "dependabot_alert"],
      public: false,
    },
    {
      bot_token: "token2",
      chat_id: "@channel",
      events: ["push", "release", "dependabot_alert"],
      public: true,
    },
  ],
};

describe("matchTargets", () => {
  it("matches event type for non-public targets", () => {
    const result = matchTargets(baseConfig, "push", false);
    expect(result).toHaveLength(2);
  });

  it("filters public targets for private repos", () => {
    const result = matchTargets(baseConfig, "push", true);
    expect(result).toHaveLength(1);
    expect(result[0].bot_token).toBe("token1");
  });

  it("filters sensitive events for public targets", () => {
    const result = matchTargets(baseConfig, "dependabot_alert", false);
    expect(result).toHaveLength(1);
    expect(result[0].bot_token).toBe("token1");
  });

  it("returns empty array when no targets match event", () => {
    const result = matchTargets(baseConfig, "star", false);
    expect(result).toHaveLength(0);
  });
});
