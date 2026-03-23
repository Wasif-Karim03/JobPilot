import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: required("REDIS_URL"),
  ENCRYPTION_KEY: required("ENCRYPTION_KEY"),
  CLAUDE_API_KEY: optional("CLAUDE_API_KEY"),
  GOOGLE_CLIENT_ID: optional("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optional("GOOGLE_CLIENT_SECRET"),
  HUNTER_API_KEY: optional("HUNTER_API_KEY"),
  LOG_LEVEL: optional("LOG_LEVEL", "info"),
  SERVICE_NAME: optional("SERVICE_NAME", "jobpilot-worker"),
  NODE_ENV: optional("NODE_ENV", "development"),
};
