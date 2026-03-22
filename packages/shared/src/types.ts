// Shared types between web and worker

export type SearchDepth = "LIGHT" | "STANDARD" | "DEEP";

export type JobStatus =
  | "DISCOVERED"
  | "BOOKMARKED"
  | "APPLYING"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

export type OutreachType = "EMAIL" | "LINKEDIN";

export interface JobSearchPayload {
  userId: string;
  searchDepth: SearchDepth;
  searchRunId: string;
}

export interface MatchAnalysisPayload {
  jobId: string;
  userId: string;
}

export interface CompanyIntelPayload {
  jobId: string;
  userId: string;
}

export interface EmailScanPayload {
  userId: string;
}

export interface MatchAnalysisResult {
  matchScore: number;
  titleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  missingKeywords: string[];
  suggestions: string[];
  details: string;
}

export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salaryRange?: string;
  postedDate?: string;
  description?: string;
}
