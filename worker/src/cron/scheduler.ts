import { jobSearchQueue, emailScanQueue } from "../queues";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";

// ─── Daily search enqueue ─────────────────────────────────────────────────────
// Runs every hour, checks which users' searchTime matches current hour

export async function enqueueDailySearches(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  // Only run in the first 5 minutes of each hour
  if (currentMinute > 5) return;

  logger.info("Checking daily searches to enqueue", { currentHour });

  try {
    const users = await db.user.findMany({
      where: { onboardingComplete: true },
      include: {
        apiConfig: true,
        preferences: true,
      },
    });

    let enqueued = 0;

    for (const user of users) {
      if (!user.apiConfig?.dailySearchEnabled) continue;
      if (!user.preferences) continue;

      // Parse user's preferred search time (HH:MM format, stored as local time)
      const [prefHour] = (user.preferences.searchTime ?? "08:00").split(":").map(Number);

      if (prefHour !== currentHour) continue;

      // Check if a search run was already created today for this user
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const existingRun = await db.searchRun.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay },
          status: { in: ["QUEUED", "RUNNING", "COMPLETED"] },
        },
      });

      if (existingRun) continue;

      // Create a search run record
      const searchRun = await db.searchRun.create({
        data: {
          userId: user.id,
          searchDepth: user.apiConfig.searchDepth,
          status: "QUEUED",
        },
      });

      await jobSearchQueue.add(
        "daily-search",
        {
          userId: user.id,
          searchDepth: user.apiConfig.searchDepth,
          searchRunId: searchRun.id,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 60000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        }
      );

      enqueued++;
      logger.info("Enqueued daily search", { userId: user.id, searchRunId: searchRun.id });
    }

    logger.info("Daily search enqueue done", { enqueued });
  } catch (err) {
    logger.error("Daily search enqueue failed", { error: (err as Error).message });
  }
}

// ─── Email scan enqueue ───────────────────────────────────────────────────────
// Runs every hour, enqueues email scan for all users with active Gmail

export async function enqueueEmailScans(): Promise<void> {
  const db = getDb();

  logger.info("Enqueuing email scans");

  try {
    const connections = await db.gmailConnection.findMany({
      where: { isActive: true },
      select: { userId: true },
    });

    for (const { userId } of connections) {
      await emailScanQueue.add(
        "email-scan",
        { userId },
        {
          attempts: 2,
          backoff: { type: "fixed", delay: 30000 },
          removeOnComplete: { count: 200 },
        }
      );
    }

    logger.info("Email scans enqueued", { count: connections.length });
  } catch (err) {
    logger.error("Email scan enqueue failed", { error: (err as Error).message });
  }
}

// ─── Incomplete account cleanup ───────────────────────────────────────────────
// Deletes users who registered but never finished onboarding within 1 hour.
// Cascade delete removes all their partial data (resume drafts, sessions, etc.)

export async function cleanupIncompleteAccounts(): Promise<void> {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const result = await db.user.deleteMany({
      where: {
        onboardingComplete: false,
        createdAt: { lt: oneHourAgo },
      },
    });

    if (result.count > 0) {
      logger.info("Deleted incomplete accounts", { count: result.count });
    }
  } catch (err) {
    logger.error("Incomplete account cleanup failed", { error: (err as Error).message });
  }
}

// ─── Stale search cleanup ─────────────────────────────────────────────────────

export async function cleanupStaleSearchRuns(): Promise<void> {
  const db = getDb();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  try {
    const result = await db.searchRun.updateMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: thirtyMinutesAgo },
      },
      data: {
        status: "FAILED",
        errorLog: "Search run timed out after 30 minutes",
        completedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.warn("Cleaned up stale search runs", { count: result.count });
    }
  } catch (err) {
    logger.error("Stale search cleanup failed", { error: (err as Error).message });
  }
}

// ─── Cron runner ─────────────────────────────────────────────────────────────

export function startCronScheduler(): NodeJS.Timeout[] {
  const timers: NodeJS.Timeout[] = [];

  // Every hour: enqueue daily searches
  timers.push(
    setInterval(() => void enqueueDailySearches(), 60 * 60 * 1000)
  );

  // Every hour: enqueue email scans
  timers.push(
    setInterval(() => void enqueueEmailScans(), 60 * 60 * 1000)
  );

  // Every 30 minutes: cleanup stale runs
  timers.push(
    setInterval(() => void cleanupStaleSearchRuns(), 30 * 60 * 1000)
  );

  // Every 30 minutes: delete accounts that never finished onboarding
  timers.push(
    setInterval(() => void cleanupIncompleteAccounts(), 30 * 60 * 1000)
  );

  // Run immediately on startup
  void enqueueDailySearches();
  void enqueueEmailScans();
  void cleanupIncompleteAccounts();

  logger.info("Cron scheduler started");
  return timers;
}
