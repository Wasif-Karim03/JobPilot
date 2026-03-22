import { Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";
import { createClaudeClient, classifyEmail } from "../services/claude";
import { getAuthenticatedGmailClient, scanGmailMessages } from "../services/gmail";
import { encrypt } from "@jobpilot/shared/encryption";
import type { EmailScanPayload } from "@jobpilot/shared/types";

export function createEmailScanWorker(): Worker {
  return new Worker<EmailScanPayload>(
    "email-scan",
    async (job: Job<EmailScanPayload>) => {
      const { userId } = job.data;
      const db = getDb();

      logger.info("Email scan started", { userId });

      const [gmailConnection, apiConfig] = await Promise.all([
        db.gmailConnection.findUnique({ where: { userId } }),
        db.userApiConfig.findUnique({ where: { userId } }),
      ]);

      if (!gmailConnection?.isActive) {
        logger.info("No active Gmail connection, skipping", { userId });
        return;
      }

      if (!apiConfig) {
        logger.warn("No API config for email scan", { userId });
        return;
      }

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

      // Scan messages since last scan
      const messages = await scanGmailMessages(
        oauth2Client,
        gmailConnection.lastScanAt ?? undefined
      );

      logger.info("Gmail messages found", { count: messages.length, userId });

      if (messages.length === 0) {
        await db.gmailConnection.update({
          where: { userId },
          data: { lastScanAt: new Date() },
        });
        return;
      }

      const claudeClient = createClaudeClient(
        apiConfig.claudeApiKeyEncrypted,
        apiConfig.claudeApiKeyIv
      );

      let processed = 0;

      for (const message of messages) {
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

      // Update last scan time
      await db.gmailConnection.update({
        where: { userId },
        data: { lastScanAt: new Date() },
      });

      logger.info("Email scan complete", { userId, processed });
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
    }
  );
}
