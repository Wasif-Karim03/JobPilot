import "./lib/env"; // Load env first
import { logger } from "./lib/logger";
import { getRedis, closeRedis } from "./lib/redis";
import { getDb, closeDb } from "./lib/db";
import { createJobSearchWorker } from "./processors/job-search.processor";
import { createMatchAnalysisWorker } from "./processors/match-analysis.processor";
import { createCompanyIntelWorker } from "./processors/company-intel.processor";
import { createEmailScanWorker } from "./processors/email-scan.processor";
import { startCronScheduler } from "./cron/scheduler";
import type { Worker } from "bullmq";

async function main() {
  logger.info("JobPilot Worker starting...");

  // Verify DB + Redis connectivity
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    logger.info("Database connected");
  } catch (err) {
    logger.error("Database connection failed", { error: (err as Error).message });
    process.exit(1);
  }

  try {
    const redis = getRedis();
    await redis.ping();
    logger.info("Redis connected");
  } catch (err) {
    logger.error("Redis connection failed", { error: (err as Error).message });
    process.exit(1);
  }

  // Start all workers
  const workers: Worker[] = [
    createJobSearchWorker(),
    createMatchAnalysisWorker(),
    createCompanyIntelWorker(),
    createEmailScanWorker(),
  ];

  for (const worker of workers) {
    worker.on("completed", (job) => {
      logger.info("Job completed", { queue: worker.name, jobId: job.id });
    });
    worker.on("failed", (job, err) => {
      logger.error("Job failed", {
        queue: worker.name,
        jobId: job?.id,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });
    worker.on("error", (err) => {
      logger.error("Worker error", { queue: worker.name, error: err.message });
    });
  }

  logger.info("All workers started", { count: workers.length });

  // Start cron scheduler
  const cronTimers = startCronScheduler();

  // Graceful shutdown
  async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Stop cron timers
    for (const timer of cronTimers) clearInterval(timer);

    // Close workers (waits for active jobs to finish)
    await Promise.all(workers.map((w) => w.close()));
    logger.info("All workers stopped");

    await Promise.all([closeRedis(), closeDb()]);
    logger.info("Connections closed. Goodbye.");
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  logger.info("JobPilot Worker ready");
}

main().catch((err) => {
  logger.error("Fatal startup error", { error: (err as Error).message });
  process.exit(1);
});
