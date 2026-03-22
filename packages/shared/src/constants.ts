export const QUEUE_NAMES = {
  JOB_SEARCH: "job-search",
  EMAIL_SCAN: "email-scan",
  COMPANY_INTEL: "company-intel",
  MATCH_ANALYSIS: "match-analysis",
} as const;

export const CLAUDE_MODELS = {
  OPUS: "claude-opus-4-6",
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
} as const;

export const MATCH_SCORE_THRESHOLDS = {
  LOW: 40,
  MEDIUM: 60,
  GOOD: 80,
} as const;
