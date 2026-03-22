import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import type {
  JobSearchPayload,
  MatchAnalysisPayload,
  CompanyIntelPayload,
  EmailScanPayload,
} from "@jobpilot/shared/types";

const connection = getRedisConnectionOptions();

export const jobSearchQueue = new Queue<JobSearchPayload>("job-search", { connection });
export const matchAnalysisQueue = new Queue<MatchAnalysisPayload>("match-analysis", { connection });
export const companyIntelQueue = new Queue<CompanyIntelPayload>("company-intel", { connection });
export const emailScanQueue = new Queue<EmailScanPayload>("email-scan", { connection });
