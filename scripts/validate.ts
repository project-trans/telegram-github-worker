interface Target {
  bot_token: string;
  chat_id: string;
  events: string[];
  public: boolean;
}

interface RepoConfig {
  secret: string;
  targets: Target[];
}

interface AdminConfig {
  bot_token: string;
  chat_id: string;
}

export type ConfigMap = Record<string, RepoConfig | AdminConfig>;

export function validateConfig(config: ConfigMap): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === "__admin__") {
      validateAdminConfig(value as AdminConfig, key);
    } else {
      validateRepoConfig(value as RepoConfig, key);
    }
  }
}

export function validateAdminConfig(config: AdminConfig, key: string): void {
  if (typeof config.bot_token !== "string" || !config.bot_token) {
    throw new Error(`[${key}] bot_token must be a non-empty string`);
  }
  if (typeof config.chat_id !== "string" || !config.chat_id) {
    throw new Error(`[${key}] chat_id must be a non-empty string`);
  }
}

export function validateRepoConfig(config: RepoConfig, key: string): void {
  if (typeof config.secret !== "string" || !config.secret) {
    throw new Error(`[${key}] secret must be a non-empty string`);
  }
  if (!Array.isArray(config.targets)) {
    throw new Error(`[${key}] targets must be an array`);
  }
  for (let i = 0; i < config.targets.length; i++) {
    const t = config.targets[i];
    if (typeof t.bot_token !== "string" || !t.bot_token) {
      throw new Error(`[${key}] targets[${i}].bot_token must be a non-empty string`);
    }
    if (typeof t.chat_id !== "string" || !t.chat_id) {
      throw new Error(`[${key}] targets[${i}].chat_id must be a non-empty string`);
    }
    if (!Array.isArray(t.events)) {
      throw new Error(`[${key}] targets[${i}].events must be an array`);
    }
    if (typeof t.public !== "boolean") {
      throw new Error(`[${key}] targets[${i}].public must be a boolean`);
    }
  }
}
