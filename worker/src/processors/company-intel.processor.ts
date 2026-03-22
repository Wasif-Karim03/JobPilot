import { Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { getDb } from "../lib/db";
import { logger } from "../lib/logger";
import { createClaudeClient, researchCompany } from "../services/claude";
import { findEmail, companyNameToDomain } from "../services/hunter";
import type { CompanyIntelPayload } from "@jobpilot/shared/types";

export function createCompanyIntelWorker(): Worker {
  return new Worker<CompanyIntelPayload>(
    "company-intel",
    async (job: Job<CompanyIntelPayload>) => {
      const { jobId, userId } = job.data;
      const db = getDb();

      logger.info("Company intel started", { jobId, userId });

      const [jobRecord, apiConfig, masterResume] = await Promise.all([
        db.job.findFirst({ where: { id: jobId, userId } }),
        db.userApiConfig.findUnique({ where: { userId } }),
        db.resume.findFirst({ where: { userId, isMaster: true } }),
      ]);

      if (!jobRecord) throw new Error(`Job ${jobId} not found`);
      if (!apiConfig) throw new Error("No API config");

      // Extract user's school from education data
      let userSchool: string | undefined;
      if (Array.isArray(masterResume?.education)) {
        const edu = masterResume.education as Array<Record<string, string>>;
        userSchool = edu[0]?.school;
      }

      const client = createClaudeClient(apiConfig.claudeApiKeyEncrypted, apiConfig.claudeApiKeyIv);

      const intel = await researchCompany(
        client,
        apiConfig.researchModel,
        jobRecord.company,
        jobRecord.title,
        userSchool
      );

      // Save company info to job
      if (Object.keys(intel.companyInfo).length > 0) {
        await db.job.update({
          where: { id: jobId },
          data: { companyInfo: intel.companyInfo },
        });
      }

      // Save contacts
      const domain = companyNameToDomain(jobRecord.company);

      for (const contact of intel.contacts) {
        const nameParts = contact.name.trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");

        let email: string | null = null;
        let emailConfidence = 0;

        // Try Hunter.io for email discovery
        if (firstName && lastName) {
          try {
            const hunterResult = await findEmail(firstName, lastName, domain);
            email = hunterResult.email;
            emailConfidence = hunterResult.confidence;
          } catch {
            // Hunter.io failure is non-fatal
          }
        }

        await db.jobContact.upsert({
          where: {
            // Use a composite unique key — name + jobId
            // Since there's no unique constraint on name+jobId, we use create/skip pattern
            id: `${jobId}-${contact.name}`.replace(/\s+/g, "-").toLowerCase().slice(0, 25),
          },
          update: {
            title: contact.title,
            email: email ?? undefined,
            emailConfidence,
            isAlumni: contact.isAlumni,
            alumniSchool: contact.alumniSchool ?? null,
            relationshipType: mapRelationType(contact.relationshipType),
            outreachPriority: contact.outreachPriority,
            profileSummary: contact.profileSummary ?? null,
          },
          create: {
            id: `${jobId}-${contact.name}`.replace(/\s+/g, "-").toLowerCase().slice(0, 25),
            jobId,
            name: contact.name,
            title: contact.title,
            email: email ?? null,
            emailConfidence,
            isAlumni: contact.isAlumni,
            alumniSchool: contact.alumniSchool ?? null,
            relationshipType: mapRelationType(contact.relationshipType),
            outreachPriority: contact.outreachPriority,
            profileSummary: contact.profileSummary ?? null,
          },
        });
      }

      logger.info("Company intel complete", {
        jobId,
        company: jobRecord.company,
        contacts: intel.contacts.length,
      });
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
    }
  );
}

function mapRelationType(type: string): "ALUMNI" | "CEO" | "CTO" | "VP_ENGINEERING" | "ENGINEERING_MANAGER" | "HR_RECRUITER" | "HIRING_MANAGER" | "EMPLOYEE" | "OTHER" {
  const map: Record<string, "ALUMNI" | "CEO" | "CTO" | "VP_ENGINEERING" | "ENGINEERING_MANAGER" | "HR_RECRUITER" | "HIRING_MANAGER" | "EMPLOYEE" | "OTHER"> = {
    ALUMNI: "ALUMNI",
    CEO: "CEO",
    CTO: "CTO",
    VP_ENGINEERING: "VP_ENGINEERING",
    ENGINEERING_MANAGER: "ENGINEERING_MANAGER",
    HR_RECRUITER: "HR_RECRUITER",
    HIRING_MANAGER: "HIRING_MANAGER",
    EMPLOYEE: "EMPLOYEE",
  };
  return map[type.toUpperCase()] ?? "OTHER";
}
