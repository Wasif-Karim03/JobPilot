import { Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";
import { createClaudeClient, searchJobs } from "../services/claude";
import { matchAnalysisQueue } from "../queues";
import type { JobSearchPayload, DiscoveredJob } from "@jobpilot/shared/types";

export function createJobSearchWorker(): Worker {
  return new Worker<JobSearchPayload>(
    "job-search",
    async (job: Job<JobSearchPayload>) => {
      const { userId, searchDepth, searchRunId } = job.data;
      const db = getDb();

      logger.info("Job search started", { userId, searchDepth, searchRunId });

      // Mark run as RUNNING
      await db.searchRun.update({
        where: { id: searchRunId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      try {
        // Fetch user config
        const [apiConfig, preferences, masterResume] = await Promise.all([
          db.userApiConfig.findUnique({ where: { userId } }),
          db.jobPreferences.findUnique({ where: { userId } }),
          db.resume.findFirst({ where: { userId, isMaster: true } }),
        ]);

        if (!apiConfig) throw new Error("No API config found for user");
        if (!preferences) throw new Error("No preferences found for user");

        const model =
          searchDepth === "LIGHT"
            ? apiConfig.executionModel
            : apiConfig.researchModel;

        const client = createClaudeClient(
          apiConfig.claudeApiKeyEncrypted,
          apiConfig.claudeApiKeyIv
        );

        // Build resume summary for search context
        const resumeSummary = buildResumeSummary(masterResume);

        // Run search
        const discovered = await searchJobs(client, model, preferences, resumeSummary);

        logger.info("Jobs discovered", { count: discovered.length, userId });

        // Store jobs (with dedup)
        let saved = 0;
        const jobsToAnalyze: string[] = [];

        for (const job of discovered) {
          if (!job.url || !job.title || !job.company) continue;

          try {
            const existing = await db.job.findFirst({
              where: { userId, url: job.url },
            });

            if (existing) continue;

            const created = await db.job.create({
              data: {
                userId,
                searchRunId,
                title: job.title,
                company: job.company,
                location: job.location ?? null,
                url: job.url,
                source: job.source ?? "ai_search",
                description: job.description ?? null,
                salaryRange: job.salaryRange ?? null,
                postedDate: job.postedDate ? new Date(job.postedDate) : null,
                status: "DISCOVERED",
              },
            });

            saved++;

            // Queue match analysis for STANDARD+ depth
            if (searchDepth !== "LIGHT" && masterResume) {
              jobsToAnalyze.push(created.id);
            }
          } catch {
            // Skip duplicate URL constraint violations
          }
        }

        // Enqueue match analysis jobs
        for (const jobId of jobsToAnalyze) {
          await matchAnalysisQueue.add(
            `analyze-${jobId}` as string & {},
            { jobId, userId },
            { attempts: 2, backoff: { type: "exponential", delay: 30000 } }
          );
        }

        // Mark run complete
        await db.searchRun.update({
          where: { id: searchRunId },
          data: {
            status: "COMPLETED",
            jobsFound: discovered.length,
            jobsMatched: saved,
            completedAt: new Date(),
          },
        });

        logger.info("Job search completed", { userId, saved, searchRunId });
      } catch (err) {
        logger.error("Job search failed", { userId, error: (err as Error).message, searchRunId });

        await db.searchRun.update({
          where: { id: searchRunId },
          data: {
            status: "FAILED",
            errorLog: (err as Error).message,
            completedAt: new Date(),
          },
        });

        throw err;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
      limiter: { max: 5, duration: 60000 }, // 5 searches per minute max
    }
  );
}

function buildResumeSummary(
  resume: {
    parsedContent?: string | null;
    summary?: string | null;
    skills?: unknown;
    experience?: unknown;
  } | null
): string {
  if (!resume) return "Entry-level candidate";
  if (resume.parsedContent) return resume.parsedContent.slice(0, 2000);

  const parts: string[] = [];
  if (resume.summary) parts.push(resume.summary);

  if (resume.skills && typeof resume.skills === "object") {
    const s = resume.skills as Record<string, string>;
    if (s.technical) parts.push(`Skills: ${s.technical}`);
    if (s.frameworks) parts.push(`Frameworks: ${s.frameworks}`);
  }

  return parts.join("\n") || "Software engineering candidate";
}
