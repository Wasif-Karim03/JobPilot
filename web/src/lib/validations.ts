import { z } from "zod";

// ============================================================
// AUTH
// ============================================================

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// USER
// ============================================================

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url("Invalid URL").optional().nullable(),
});

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().email(),
});

// ============================================================
// API KEY / SETTINGS
// ============================================================

export const setApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(40, "API key too short")
    .max(200, "API key too long")
    .refine((key) => key.startsWith("sk-ant-"), {
      message: 'Claude API keys must start with "sk-ant-"',
    }),
});

export const updateApiConfigSchema = z.object({
  researchModel: z
    .enum(["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"])
    .optional(),
  executionModel: z
    .enum(["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"])
    .optional(),
  searchDepth: z.enum(["LIGHT", "STANDARD", "DEEP"]).optional(),
  dailySearchEnabled: z.boolean().optional(),
  maxDailyApiCost: z.number().min(1).max(100).optional(),
});

export const updatePreferencesSchema = z.object({
  targetTitles: z.array(z.string().min(1).max(100)).max(10).optional(),
  targetLocations: z.array(z.string().min(1).max(100)).max(10).optional(),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "any"]).optional(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  companySizes: z.array(z.enum(["startup", "small", "mid", "large", "enterprise"])).optional(),
  industries: z.array(z.string().min(1).max(50)).optional(),
  excludeCompanies: z.array(z.string().min(1).max(100)).optional(),
  experienceLevel: z.enum(["intern", "entry", "mid", "senior"]).optional(),
  visaSponsorship: z.boolean().optional(),
  keywords: z.array(z.string().min(1).max(50)).optional(),
  searchTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:MM format")
    .optional(),
  timezone: z.string().min(1).max(50).optional(),
});

// ============================================================
// RESUME
// ============================================================

export const createResumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  format: z.enum(["STRUCTURED", "RICH_TEXT", "UPLOADED"]).optional(),
  contactInfo: z.record(z.string(), z.unknown()).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  experience: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  education: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  skills: z.record(z.string(), z.unknown()).optional().nullable(),
  projects: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  certifications: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  customSections: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  richTextContent: z.record(z.string(), z.unknown()).optional().nullable(),
  parsedContent: z.string().optional().nullable(),
});

export const updateResumeSchema = createResumeSchema.partial().extend({
  id: z.string().min(1),
});

// ============================================================
// JOB
// ============================================================

export const jobListSchema = z.object({
  status: z
    .enum([
      "DISCOVERED",
      "BOOKMARKED",
      "APPLYING",
      "APPLIED",
      "PHONE_SCREEN",
      "INTERVIEW",
      "OFFER",
      "REJECTED",
      "WITHDRAWN",
      "ARCHIVED",
    ])
    .optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
  maxMatchScore: z.number().min(0).max(100).optional(),
  company: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["matchScore", "discoveredAt", "company"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(10).max(50).optional().default(20),
});

export const triggerSearchSchema = z.object({
  depth: z.enum(["LIGHT", "STANDARD", "DEEP"]).optional(),
});

// ============================================================
// APPLICATION
// ============================================================

export const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  appliedVia: z
    .enum(["company_site", "linkedin", "indeed", "referral", "other"])
    .optional()
    .nullable(),
  resumeUsed: z.string().optional().nullable(),
  appliedDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateApplicationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "DISCOVERED",
    "BOOKMARKED",
    "APPLYING",
    "APPLIED",
    "PHONE_SCREEN",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
    "ARCHIVED",
  ]),
  notes: z.string().max(1000).optional(),
});

// ============================================================
// OUTREACH
// ============================================================

export const updateOutreachDraftSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(5000),
  subject: z.string().max(200).optional().nullable(),
});

// ============================================================
// PAGINATION
// ============================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(20),
});
