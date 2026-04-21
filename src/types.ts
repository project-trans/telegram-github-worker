export interface Target {
  bot_token: string;
  chat_id: string;
  events: string[];
  public: boolean;
  silence_workflow?: boolean;
}

export interface RepoConfig {
  secret: string;
  targets: Target[];
}

export interface AdminConfig {
  bot_token: string;
  chat_id: string;
}

export interface GitHubEvent {
  action?: string;
  repository?: {
    full_name: string;
    private: boolean;
    html_url: string;
    name: string;
    owner: {
      login: string;
    };
  };
  sender?: {
    login: string;
    html_url: string;
  };
  [key: string]: unknown;
}
