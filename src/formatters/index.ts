import type { GitHubEvent } from "../types";
import { formatFallback } from "./fallback";

type Formatter = (event: GitHubEvent) => string;

const formatters: Record<string, Formatter> = {};

export function getFormatter(eventType: string): Formatter {
  return formatters[eventType] ?? ((event: GitHubEvent) => formatFallback(event, eventType));
}
