import { describe, it, expect } from "vitest";
import { validateConfig, validateAdminConfig, validateRepoConfig } from "../scripts/validate";

describe("validateAdminConfig", () => {
  it("accepts valid admin config", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "123:abc", chat_id: "456" }, "admin")
    ).not.toThrow();
  });

  it("rejects missing bot_token", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "", chat_id: "456" } as any, "admin")
    ).toThrow("[admin] bot_token");
  });

  it("rejects missing chat_id", () => {
    expect(() =>
      validateAdminConfig({ bot_token: "123", chat_id: "" } as any, "admin")
    ).toThrow("[admin] chat_id");
  });
});

describe("validateRepoConfig", () => {
  const validConfig = {
    secret: "s",
    targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: false }],
  };

  it("accepts valid repo config", () => {
    expect(() => validateRepoConfig(validConfig, "owner/repo")).not.toThrow();
  });

  it("rejects missing secret", () => {
    expect(() =>
      validateRepoConfig({ ...validConfig, secret: "" } as any, "owner/repo")
    ).toThrow("[owner/repo] secret");
  });

  it("rejects non-array targets", () => {
    expect(() =>
      validateRepoConfig({ ...validConfig, targets: "bad" } as any, "owner/repo")
    ).toThrow("[owner/repo] targets");
  });

  it("rejects target with missing bot_token", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "", chat_id: "c", events: ["push"], public: false }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].bot_token");
  });

  it("rejects target with missing events", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: "bad" as any, public: false }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].events");
  });

  it("rejects target with non-boolean public", () => {
    const cfg = { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: "yes" as any }] };
    expect(() => validateRepoConfig(cfg as any, "owner/repo")).toThrow("targets[0].public");
  });
});

describe("validateConfig", () => {
  it("routes __admin__ to admin validation", () => {
    expect(() =>
      validateConfig({ "__admin__": { bot_token: "t", chat_id: "c" } })
    ).not.toThrow();
  });

  it("routes other keys to repo validation", () => {
    expect(() =>
      validateConfig({
        "owner/repo": { secret: "s", targets: [{ bot_token: "t", chat_id: "c", events: ["push"], public: false }] },
      })
    ).not.toThrow();
  });

  it("rejects invalid admin config in full config", () => {
    expect(() =>
      validateConfig({ "__admin__": { bot_token: "", chat_id: "c" } as any })
    ).toThrow("[__admin__] bot_token");
  });
});
