import { verifySignature } from "./router";
import { getRepoConfig, getOrgWildcardConfig, getAdminConfig } from "./config";
import { matchTargets } from "./matcher";
import { getFormatter } from "./formatters/index";
import { sendMessage, sendAlert } from "./telegram";

export interface Env {
  TG_GH_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const eventType = request.headers.get("X-GitHub-Event") ?? "";

    if (eventType === "ping") {
      return new Response("OK", { status: 200 });
    }

    const signature = request.headers.get("X-Hub-Signature-256");
    const body = await request.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const fullName = (payload.repository as { full_name?: string } | undefined)?.full_name;
    const orgName = (payload.organization as { login?: string } | undefined)?.login;

    if (!fullName && !orgName) {
      return new Response("OK", { status: 200 });
    }

    let adminConfig;
    try {
      adminConfig = await getAdminConfig(env.TG_GH_KV);
    } catch (e) {
      console.error("Failed to read admin config:", e);
      return new Response("Internal error", { status: 500 });
    }

    let config = null;
    if (fullName) {
      config = await getRepoConfig(env.TG_GH_KV, fullName);
    }
    if (!config && orgName) {
      config = await getOrgWildcardConfig(env.TG_GH_KV, orgName);
    }
    if (!config) {
      return new Response("No Content", { status: 204 });
    }

    const valid = await verifySignature(body, signature, config.secret);
    if (!valid) {
      if (adminConfig) {
        const context = fullName ?? orgName ?? "unknown";
        try {
          await sendAlert(adminConfig, `Signature verification failed for ${context} (event: ${eventType})`);
        } catch {
          // ignore alert failures
        }
      }
      return new Response("Unauthorized", { status: 401 });
    }

    const isPrivate = (payload.repository as { private?: boolean } | undefined)?.private ?? false;
    const targets = matchTargets(config, eventType, isPrivate);

    const formatter = getFormatter(eventType);
    const message = formatter(payload as import("./types").GitHubEvent);

    const errors: string[] = [];
    for (const target of targets) {
      try {
        await sendMessage({
          bot_token: target.bot_token,
          chat_id: target.chat_id,
          text: message,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to send to ${target.chat_id}: ${errMsg}`);
      }
    }

    if (errors.length > 0 && adminConfig) {
      const context = fullName ?? orgName ?? "unknown";
      try {
        await sendAlert(adminConfig, `Telegram send errors for ${context} (${eventType}):\n${errors.join("\n")}`);
      } catch {
        // ignore alert failures
      }
    }

    return new Response("Created", { status: 201 });
  },
};
