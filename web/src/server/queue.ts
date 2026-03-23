// Server-side BullMQ queue client — lets the web layer enqueue jobs
// that the worker service will process.
import { Queue } from "bullmq";

function parseRedisUrl(redisUrl: string) {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export function getEmailScanQueue(): Queue {
  const connection = parseRedisUrl(
    process.env.REDIS_URL ?? "redis://localhost:6379"
  );
  return new Queue("email-scan", { connection });
}
