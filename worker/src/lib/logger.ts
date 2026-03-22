import { env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const configuredLevel = (env.LOG_LEVEL as LogLevel) ?? "info";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[configuredLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: env.SERVICE_NAME,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
