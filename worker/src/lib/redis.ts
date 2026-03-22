import { Redis } from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    redisInstance.on("connect", () => logger.info("Redis connected"));
    redisInstance.on("error", (err) => logger.error("Redis error", { error: err.message }));
  }
  return redisInstance;
}

/** Parse Redis URL into connection options for BullMQ */
export function getRedisConnectionOptions() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || "localhost",
    port: parseInt(url.port) || 6379,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
