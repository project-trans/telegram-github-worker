import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { validateConfig } from "./validate";
import type { ConfigMap } from "./validate";

function parseFile(filePath: string): ConfigMap {
  const raw = readFileSync(filePath, "utf-8");
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return yaml.load(raw) as ConfigMap;
  }
  if (filePath.endsWith(".json")) {
    return JSON.parse(raw) as ConfigMap;
  }
  throw new Error(`Unsupported file extension: ${filePath}. Use .yaml, .yml, or .json`);
}

function getKvNamespaceId(): string {
  const toml = readFileSync("wrangler.toml", "utf-8");
  const match = toml.match(/id\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Could not find KV namespace id in wrangler.toml");
  }
  return match[1];
}

function wrangler(args: string[], stdin?: string): string {
  const result = execSync(`npx wrangler ${args.join(" ")}`, {
    encoding: "utf-8",
    input: stdin,
  });
  return result;
}

function kvKey(name: string): string {
  return `config:${name}`;
}

function listConfigKeys(namespaceId: string): string[] {
  const output = wrangler(["kv", "key", "list", "--namespace-id", namespaceId, "--prefix=config:"]);
  const entries: Array<{ name: string }> = JSON.parse(output);
  return entries.map((e) => e.name);
}

function syncConfig(config: ConfigMap, namespaceId: string): void {
  const desiredKeys = new Set(Object.keys(config).map(kvKey));
  const existingKeys = listConfigKeys(namespaceId);

  let deleted = 0;
  for (const key of existingKeys) {
    if (!desiredKeys.has(key)) {
      wrangler(["kv", "key", "delete", "--namespace-id", namespaceId, key]);
      console.log(`Deleted: ${key}`);
      deleted++;
    }
  }

  let written = 0;
  for (const [name, value] of Object.entries(config)) {
    const key = kvKey(name);
    const json = JSON.stringify(value);
    const tmpFile = join(tmpdir(), `kv-sync-${Date.now()}.json`);
    writeFileSync(tmpFile, json, "utf-8");
    wrangler(["kv", "key", "put", "--namespace-id", namespaceId, key, "--path", tmpFile]);
    unlinkSync(tmpFile);
    console.log(`Written: ${key}`);
    written++;
  }

  console.log(`\nSummary: ${written} written, ${deleted} deleted`);
}

function listKeys(namespaceId: string): void {
  const keys = listConfigKeys(namespaceId);
  if (keys.length === 0) {
    console.log("No config keys found in KV.");
    return;
  }
  for (const key of keys) {
    const value = wrangler(["kv", "key", "get", "--namespace-id", namespaceId, key]);
    console.log(`${key}: ${value}`);
  }
  console.log(`\n${keys.length} key(s)`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/sync-kv.ts <config-file>");
    console.error("       npx tsx scripts/sync-kv.ts --list");
    process.exit(1);
  }

  if (args[0] === "--list") {
    try {
      const namespaceId = getKvNamespaceId();
      listKeys(namespaceId);
    } catch (e) {
      console.error("Failed to list KV keys:", e instanceof Error ? e.message : e);
      process.exit(1);
    }
    return;
  }

  const filePath = args[0];

  let config: ConfigMap;
  try {
    config = parseFile(filePath);
  } catch (e) {
    console.error("Failed to parse config file:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
  const parsedConfig = config;

  try {
    validateConfig(parsedConfig);
  } catch (e) {
    console.error("Config validation failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  try {
    const namespaceId = getKvNamespaceId();
    syncConfig(parsedConfig, namespaceId);
  } catch (e) {
    console.error("KV sync failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
