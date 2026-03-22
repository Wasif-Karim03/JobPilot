export const APP_NAME = "JobPilot";
export const APP_DESCRIPTION = "AI-powered autonomous job search & application management";

// Auth
export const SESSION_EXPIRY_DAYS = 7;
export const COOKIE_PREFIX = "jobpilot";

// Rate limits (per user)
export const RATE_LIMITS = {
  AUTH: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 req / 15 min
  API_KEY_VALIDATE: { requests: 3, windowMs: 60 * 1000 }, // 3 req / min
  SEARCH_TRIGGER: { requests: 1, windowMs: 60 * 60 * 1000 }, // 1 req / hour
  EMAIL_SCAN: { requests: 1, windowMs: 15 * 60 * 1000 }, // 1 req / 15 min
  OUTREACH_GENERATE: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 req / hour
  GENERAL: { requests: 100, windowMs: 60 * 1000 }, // 100 req / min
  ADMIN: { requests: 60, windowMs: 60 * 1000 }, // 60 req / min
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// Match score thresholds
export const MATCH_SCORE = {
  LOW: 40,
  MEDIUM: 60,
  GOOD: 80,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_RESUME_SIZE_MB: 10,
  ALLOWED_RESUME_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const;

// Job preferences defaults
export const PREFERENCES_DEFAULTS = {
  REMOTE: "any",
  EXPERIENCE: "entry",
  SEARCH_TIME: "08:00",
  TIMEZONE: "America/New_York",
  MAX_DAILY_COST: 10.0,
} as const;

// AI models
export const CLAUDE_MODELS = {
  OPUS: "claude-opus-4-6",
  SONNET: "claude-sonnet-4-6",
  HAIKU: "claude-haiku-4-5-20251001",
} as const;

// Cache TTL (seconds)
export const CACHE_TTL = {
  JOB_LIST: 5 * 60,
  JOB_DETAIL: 2 * 60,
  DASHBOARD_STATS: 2 * 60,
  USER_PROFILE: 10 * 60,
} as const;

// Queue names
export const QUEUE_NAMES = {
  JOB_SEARCH: "job-search",
  EMAIL_SCAN: "email-scan",
  COMPANY_INTEL: "company-intel",
  MATCH_ANALYSIS: "match-analysis",
} as const;

// Outreach
export const LINKEDIN_NOTE_MAX_CHARS = 200;
