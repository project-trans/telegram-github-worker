import type { RepoConfig, AdminConfig } from "./types";

export const ADMIN_KEY = "config:__admin__";

function configKey(repo: string): string {
  return `config:${repo}`;
}

function wildcardKey(owner: string): string {
  return `config:${owner}/*`;
}

export async function getRepoConfig(
  kv: KVNamespace,
  fullName: string,
): Promise<RepoConfig | null> {
  const [owner] = fullName.split("/");

  const exact = await kv.get(configKey(fullName));
  if (exact) {
    return JSON.parse(exact) as RepoConfig;
  }

  const wildcard = await kv.get(wildcardKey(owner));
  if (wildcard) {
    return JSON.parse(wildcard) as RepoConfig;
  }

  return null;
}

export async function getOrgWildcardConfig(
  kv: KVNamespace,
  orgName: string,
): Promise<RepoConfig | null> {
  const raw = await kv.get(wildcardKey(orgName));
  if (!raw) return null;
  return JSON.parse(raw) as RepoConfig;
}

export async function getAdminConfig(
  kv: KVNamespace,
): Promise<AdminConfig | null> {
  const raw = await kv.get(ADMIN_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as AdminConfig;
}
