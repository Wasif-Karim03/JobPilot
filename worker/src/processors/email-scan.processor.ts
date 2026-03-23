import { Worker, type Job } from "bullmq";
import Anthropic from "@anthropic-ai/sdk";
import { getRedisConnectionOptions } from "../lib/redis";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";
import { classifyEmail } from "../services/claude";
import { getAuthenticatedGmailClient, scanGmailMessages } from "../services/gmail";
import { encrypt, decrypt } from "@jobpilot/shared/encryption";
import { env } from "../lib/env";
import type { EmailScanPayload } from "@jobpilot/shared/types";

export interface ScanProgress {
  percent: number;
  message: string;
}

async function progress(job: Job, percent: number, message: string) {
  await job.updateProgress({ percent, message } satisfies ScanProgress);
}

export function createEmailScanWorker(): Worker {
  return new Worker<EmailScanPayload>(
    "email-scan",
    async (job: Job<EmailScanPayload>) => {
      const { userId } = job.data;
      const db = getDb();

      await progress(job, 5, "Starting sync…");
      logger.info("Email scan started", { userId });

      const [gmailConnection, apiConfig] = await Promise.all([
        db.gmailConnection.findUnique({ where: { userId } }),
        db.userApiConfig.findUnique({ where: { userId } }),
      ]);

      if (!gmailConnection?.isActive) {
        logger.info("No active Gmail connection, skipping", { userId });
        await progress(job, 100, "No Gmail connection found.");
        return;
      }

      if (!apiConfig) {
        logger.warn("No API config for email scan", { userId });
        await progress(job, 100, "No API key configured.");
        return;
      }

      await progress(job, 15, "Connecting to Gmail…");

      // Get authenticated Gmail client
      const { client: oauth2Client, newCredentials } = await getAuthenticatedGmailClient(
        gmailConnection
      );

      // Persist refreshed tokens if needed
      if (newCredentials?.access_token) {
        const encrypted = encrypt(newCredentials.access_token);
        await db.gmailConnection.update({
          where: { userId },
          data: {
            accessTokenEncrypted: encrypted.encrypted,
            accessTokenIv: encrypted.iv,
            tokenExpiry: new Date(newCredentials.expiry_date ?? Date.now() + 3600 * 1000),
          },
        });
      }

      await progress(job, 25, "Fetching emails from Gmail…");

      // Scan messages: use lastScanAt if available, else fall back to jobSearchStartDate
      const scanSince =
        gmailConnection.lastScanAt ??
        (gmailConnection as { jobSearchStartDate?: Date | null }).jobSearchStartDate ??
        undefined;

      const messages = await scanGmailMessages(oauth2Client, scanSince);

      logger.info("Gmail messages found", { count: messages.length, userId });

      if (messages.length === 0) {
        await db.gmailConnection.update({
          where: { userId },
          data: { lastScanAt: new Date() },
        });
        await progress(job, 100, "No new emails found.");
        return;
      }

      await progress(job, 30, `Found ${messages.length} email${messages.length !== 1 ? "s" : ""}. Classifying…`);

      // Use per-user key if valid, fall back to shared server-side key
      let claudeClient: Anthropic;
      try {
        const userKey = decrypt(apiConfig.claudeApiKeyEncrypted, apiConfig.claudeApiKeyIv);
        claudeClient = new Anthropic({ apiKey: userKey });
      } catch {
        if (!env.CLAUDE_API_KEY) {
          await progress(job, 100, "No Claude API key configured.");
          logger.warn("No Claude API key available for email scan", { userId });
          return;
        }
        claudeClient = new Anthropic({ apiKey: env.CLAUDE_API_KEY });
      }

      let processed = 0;
      const total = messages.length;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // Emit progress per email: 30% → 90% range
        const scanPercent = 30 + Math.round(((i + 1) / total) * 60);
        await progress(
          job,
          scanPercent,
          `Classifying email ${i + 1} of ${total}…`
        );

        // Skip already scanned messages
        const existing = await db.emailScan.findUnique({
          where: { userId_gmailMessageId: { userId, gmailMessageId: message.id } },
        });
        if (existing) continue;

        const classification = await classifyEmail(
          claudeClient,
          apiConfig.executionModel,
          message.subject,
          message.sender,
          message.bodySnippet
        );

        if (!classification.isJobRelated) continue;

        // Try to match to existing job by company name
        let linkedJobId: string | null = null;
        if (classification.company) {
          const matchedJob = await db.job.findFirst({
            where: {
              userId,
              company: { contains: classification.company, mode: "insensitive" },
              status: { notIn: ["ARCHIVED", "REJECTED", "WITHDRAWN"] },
            },
            orderBy: { createdAt: "desc" },
          });
          linkedJobId = matchedJob?.id ?? null;
        }

        // Save scan record
        await db.emailScan.create({
          data: {
            userId,
            gmailMessageId: message.id,
            subject: message.subject,
            sender: message.sender,
            bodySnippet: message.bodySnippet.slice(0, 500),
            detectedCompany: classification.company ?? null,
            detectedStatus: classification.detectedStatus as import("@prisma/client").JobStatus ?? null,
            confidence: classification.confidence,
            emailDate: message.date,
            linkedJobId,
            processed: !!linkedJobId,
          },
        });

        // Auto-update application status if confident match
        if (
          linkedJobId &&
          classification.detectedStatus &&
          classification.confidence >= 0.8
        ) {
          const application = await db.application.findUnique({
            where: { jobId: linkedJobId },
          });

          if (application) {
            const history = Array.isArray(application.statusHistory)
              ? (application.statusHistory as object[])
              : [];

            await db.application.update({
              where: { id: application.id },
              data: {
                status: classification.detectedStatus as import("@prisma/client").JobStatus,
                statusHistory: [
                  ...history,
                  {
                    status: classification.detectedStatus,
                    date: new Date().toISOString(),
                    source: "email",
                    notes: `Auto-detected from email: "${message.subject}"`,
                  },
                ],
              },
            });

            await db.job.update({
              where: { id: linkedJobId },
              data: { status: classification.detectedStatus as import("@prisma/client").JobStatus },
            });

            logger.info("Auto-updated application status from email", {
              userId,
              jobId: linkedJobId,
              status: classification.detectedStatus,
            });
          }
        }

        processed++;
      }

      await progress(job, 95, "Saving results…");

      // Update last scan time
      await db.gmailConnection.update({
        where: { userId },
        data: { lastScanAt: new Date() },
      });

      await progress(
        job,
        100,
        processed > 0
          ? `Done! Found ${processed} job-related email${processed !== 1 ? "s" : ""}.`
          : "Done! No new job-related emails."
      );

      logger.info("Email scan complete", { userId, processed });
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
    }
  );
}
