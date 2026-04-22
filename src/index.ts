import { verifySignature } from "./router";
import { getRepoConfig, getOrgWildcardConfig, getAdminConfig } from "./config";
import { matchTargets } from "./matcher";
import { getFormatter } from "./formatters/index";
import { sendMessage, sendAlert } from "./telegram";

export interface Env {
  TG_GH_KV: KVNamespace;
  DEBUG?: string;
}

function isDebug(env: Env): boolean {
  return env.DEBUG === "1" || env.DEBUG === "true";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      console.log("rejected: non-POST method");
      return new Response("Method not allowed", { status: 405 });
    }

    const eventType = request.headers.get("X-GitHub-Event") ?? "";
    console.log(`[event:${eventType}] received`);

    if (eventType === "ping") {
      return new Response("OK", { status: 200 });
    }

    const signature = request.headers.get("X-Hub-Signature-256");
    const body = await request.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      console.log(`[event:${eventType}] invalid JSON`);
      return new Response("Invalid JSON", { status: 400 });
    }

    const fullName = (payload.repository as { full_name?: string } | undefined)?.full_name;
    const orgName = (payload.organization as { login?: string } | undefined)?.login;

    if (isDebug(env)) {
      console.log(`[event:${eventType}] fullName=${fullName} orgName=${orgName}`);
      console.log(`[event:${eventType}] env.TG_GH_KV type: ${typeof env.TG_GH_KV}, get: ${typeof env.TG_GH_KV?.get}`);

      try {
        const listResult = await env.TG_GH_KV.list({ prefix: "config:" });
        console.log(`[event:${eventType}] KV list config:* returned ${listResult.keys.length} keys`);
        for (const k of listResult.keys.slice(0, 5)) {
          console.log(`[event:${eventType}] KV key: ${k.name}`);
        }
        if (listResult.keys.length === 0) {
          await env.TG_GH_KV.put("config:__debug__", "hello");
          const debugGet = await env.TG_GH_KV.get("config:__debug__");
          console.log(`[event:${eventType}] KV put/get debug: ${debugGet}`);
        }
      } catch (e) {
        console.error(`[event:${eventType}] KV list failed:`, e);
      }
    }

    if (!fullName && !orgName) {
      console.log(`[event:${eventType}] no fullName or orgName, returning 200`);
      return new Response("OK", { status: 200 });
    }

    let adminConfig;
    try {
      adminConfig = await getAdminConfig(env.TG_GH_KV);
      console.log(`[event:${eventType}] adminConfig loaded: ${adminConfig ? "yes" : "no"}`);
    } catch (e) {
      console.error(`[event:${eventType}] failed to read admin config:`, e);
      return new Response("Internal error", { status: 500 });
    }

    let config = null;
    if (fullName) {
      config = await getRepoConfig(env.TG_GH_KV, fullName);
      console.log(`[event:${eventType}] getRepoConfig(${fullName}): ${config ? "found" : "null"}`);
    }
    if (!config && orgName) {
      config = await getOrgWildcardConfig(env.TG_GH_KV, orgName);
      console.log(`[event:${eventType}] getOrgWildcardConfig(${orgName}): ${config ? "found" : "null"}`);
    }
    if (!config) {
      console.log(`[event:${eventType}] no config matched, returning 204`);
      return new Response(null, { status: 204 });
    }

    console.log(`[event:${eventType}] config found, verifying signature`);

    const valid = await verifySignature(body, signature, config.secret);
    if (!valid) {
      console.log(`[event:${eventType}] signature verification FAILED`);
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

    console.log(`[event:${eventType}] signature OK`);

    const isPrivate = (payload.repository as { private?: boolean } | undefined)?.private ?? false;
    const targets = matchTargets(config, eventType, isPrivate);
    console.log(`[event:${eventType}] matched ${targets.length} target(s)`);

    const formatter = getFormatter(eventType);
    const message = formatter(payload as import("./types").GitHubEvent);

    const errors: string[] = [];
    for (const target of targets) {
      if (target.silence_workflow && eventType === "workflow_run") {
        const conclusion = (payload.workflow_run as Record<string, unknown> | undefined)?.conclusion;
        if (conclusion !== "failure") {
          console.log(`[event:${eventType}] silenced workflow (conclusion: ${conclusion})`);
          continue;
        }
      }

      try {
        await sendMessage({
          bot_token: target.bot_token,
          chat_id: target.chat_id,
          text: message,
        });
        console.log(`[event:${eventType}] sent to target (${target.public ? "public" : "private"})`);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error(`[event:${eventType}] failed to send to target:`, errMsg);
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
