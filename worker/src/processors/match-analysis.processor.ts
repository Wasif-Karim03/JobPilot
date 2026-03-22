import { Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";
import { createClaudeClient, analyzeMatch } from "../services/claude";
import { companyIntelQueue } from "../queues";
import type { MatchAnalysisPayload } from "@jobpilot/shared/types";

export function createMatchAnalysisWorker(): Worker {
  return new Worker<MatchAnalysisPayload>(
    "match-analysis",
    async (job: Job<MatchAnalysisPayload>) => {
      const { jobId, userId } = job.data;
      const db = getDb();

      logger.info("Match analysis started", { jobId, userId });

      const [jobRecord, apiConfig, masterResume] = await Promise.all([
        db.job.findFirst({ where: { id: jobId, userId } }),
        db.userApiConfig.findUnique({ where: { userId } }),
        db.resume.findFirst({ where: { userId, isMaster: true } }),
      ]);

      if (!jobRecord) throw new Error(`Job ${jobId} not found`);
      if (!apiConfig) throw new Error("No API config");
      if (!masterResume) {
        logger.warn("No master resume, skipping match analysis", { userId });
        return;
      }

      const client = createClaudeClient(apiConfig.claudeApiKeyEncrypted, apiConfig.claudeApiKeyIv);
      const resumeContent = buildResumeText(masterResume);

      const result = await analyzeMatch(
        client,
        apiConfig.executionModel,
        jobRecord.title,
        jobRecord.description ?? jobRecord.title,
        resumeContent
      );

      await db.job.update({
        where: { id: jobId },
        data: {
          matchScore: result.matchScore,
          matchAnalysis: {
            titleMatch: result.titleMatch,
            skillsMatch: result.skillsMatch,
            experienceMatch: result.experienceMatch,
            details: result.details,
          },
          missingKeywords: result.missingKeywords,
          matchSuggestions: result.suggestions,
        },
      });

      logger.info("Match analysis complete", { jobId, score: result.matchScore });

      // Trigger company intel for high-match jobs
      if (result.matchScore >= 80) {
        await companyIntelQueue.add(
          "research" as string & {},
          { jobId, userId },
          { attempts: 2, backoff: { type: "exponential", delay: 60000 } }
        );
        logger.info("High match — queued company intel", { jobId, score: result.matchScore });
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 5,
    }
  );
}

function buildResumeText(resume: {
  parsedContent?: string | null;
  summary?: string | null;
  skills?: unknown;
  experience?: unknown;
  education?: unknown;
}): string {
  if (resume.parsedContent) return resume.parsedContent.slice(0, 3000);

  const parts: string[] = [];

  if (resume.summary) parts.push(`SUMMARY:\n${resume.summary}`);

  if (resume.skills && typeof resume.skills === "object") {
    const s = resume.skills as Record<string, string>;
    const skillLines = Object.entries(s)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    if (skillLines) parts.push(`SKILLS:\n${skillLines}`);
  }

  if (Array.isArray(resume.experience)) {
    const expLines = (resume.experience as Array<Record<string, string>>)
      .slice(0, 3)
      .map((e) => `${e.title ?? ""} at ${e.company ?? ""} (${e.startDate ?? ""} - ${e.endDate ?? "Present"})`)
      .join("\n");
    if (expLines) parts.push(`EXPERIENCE:\n${expLines}`);
  }

  if (Array.isArray(resume.education)) {
    const eduLines = (resume.education as Array<Record<string, string>>)
      .slice(0, 2)
      .map((e) => `${e.degree ?? ""} ${e.field ?? ""} at ${e.school ?? ""}`)
      .join("\n");
    if (eduLines) parts.push(`EDUCATION:\n${eduLines}`);
  }

  return parts.join("\n\n") || "Software engineering candidate";
}
