import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "@jobpilot/shared/encryption";
import { logger } from "../lib/logger";
import type { DiscoveredJob, MatchAnalysisResult } from "@jobpilot/shared/types";

// ─── Client factory ───────────────────────────────────────────────────────────

export function createClaudeClient(encryptedKey: string, iv: string): Anthropic {
  const apiKey = decrypt(encryptedKey, iv);
  return new Anthropic({ apiKey });
}

// ─── Job Search ───────────────────────────────────────────────────────────────

export async function searchJobs(
  client: Anthropic,
  model: string,
  preferences: {
    targetTitles: string[];
    targetLocations: string[];
    remotePreference: string;
    experienceLevel: string;
    industries: string[];
    keywords: string[];
    salaryMin?: number | null;
    excludeCompanies: string[];
  },
  resumeSummary: string
): Promise<DiscoveredJob[]> {
  const prompt = buildJobSearchPrompt(preferences, resumeSummary);

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return parseJsonArray<DiscoveredJob>(text, []);
  } catch (err) {
    logger.error("Claude job search failed", { error: (err as Error).message, model });
    return [];
  }
}

function buildJobSearchPrompt(
  prefs: {
    targetTitles: string[];
    targetLocations: string[];
    remotePreference: string;
    experienceLevel: string;
    industries: string[];
    keywords: string[];
    salaryMin?: number | null;
    excludeCompanies: string[];
  },
  resume: string
): string {
  return `You are an expert job search assistant. Based on the candidate profile below, generate a list of realistic job postings they should apply to.

CANDIDATE PROFILE:
${resume}

SEARCH CRITERIA:
- Job titles: ${prefs.targetTitles.join(", ")}
- Locations: ${prefs.targetLocations.join(", ")}
- Remote preference: ${prefs.remotePreference}
- Experience level: ${prefs.experienceLevel}
- Industries: ${prefs.industries.join(", ")}
- Keywords: ${prefs.keywords.join(", ")}
${prefs.salaryMin ? `- Minimum salary: $${prefs.salaryMin}` : ""}
${prefs.excludeCompanies.length ? `- EXCLUDE companies: ${prefs.excludeCompanies.join(", ")}` : ""}

Generate 10-15 realistic job listings that match this profile. Return ONLY a valid JSON array, no other text:

[
  {
    "title": "Software Engineer",
    "company": "Acme Corp",
    "location": "Remote",
    "url": "https://example.com/jobs/123",
    "source": "company_site",
    "salaryRange": "$120k - $160k",
    "postedDate": "${new Date().toISOString().split("T")[0]}",
    "description": "Brief job description..."
  }
]`;
}

// ─── Match Analysis ───────────────────────────────────────────────────────────

export async function analyzeMatch(
  client: Anthropic,
  model: string,
  jobTitle: string,
  jobDescription: string,
  resumeContent: string
): Promise<MatchAnalysisResult> {
  const defaultResult: MatchAnalysisResult = {
    matchScore: 0,
    titleMatch: 0,
    skillsMatch: 0,
    experienceMatch: 0,
    missingKeywords: [],
    suggestions: [],
    details: "",
  };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildMatchPrompt(jobTitle, jobDescription, resumeContent),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = parseJsonObject<MatchAnalysisResult>(text, defaultResult);

    // Clamp scores 0-100
    parsed.matchScore = Math.max(0, Math.min(100, parsed.matchScore));
    parsed.titleMatch = Math.max(0, Math.min(100, parsed.titleMatch));
    parsed.skillsMatch = Math.max(0, Math.min(100, parsed.skillsMatch));
    parsed.experienceMatch = Math.max(0, Math.min(100, parsed.experienceMatch));

    return parsed;
  } catch (err) {
    logger.error("Claude match analysis failed", { error: (err as Error).message });
    return defaultResult;
  }
}

function buildMatchPrompt(title: string, description: string, resume: string): string {
  return `Analyze how well this candidate's resume matches the job posting.

JOB TITLE: ${title}

JOB DESCRIPTION:
${description.slice(0, 3000)}

CANDIDATE RESUME:
${resume.slice(0, 3000)}

Analyze the match and return ONLY a valid JSON object, no other text:
{
  "matchScore": <overall 0-100, weighted average>,
  "titleMatch": <0-100, how well title/role aligns>,
  "skillsMatch": <0-100, technical skills overlap>,
  "experienceMatch": <0-100, experience level and years match>,
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": ["Add X to skills section", "Highlight Y experience"],
  "details": "2-3 sentence summary of why this is or isn't a good match"
}

Scoring weights: titleMatch 30%, skillsMatch 40%, experienceMatch 20%, other 10%.`;
}

// ─── Company Intelligence ────────────────────────────────────────────────────

export interface CompanyIntelResult {
  companyInfo: {
    size?: string;
    industry?: string;
    description?: string;
    founded?: string;
    headquarters?: string;
  };
  contacts: Array<{
    name: string;
    title: string;
    relationshipType: string;
    outreachPriority: number;
    isAlumni: boolean;
    alumniSchool?: string;
    profileSummary?: string;
  }>;
}

export async function researchCompany(
  client: Anthropic,
  model: string,
  company: string,
  jobTitle: string,
  userSchool?: string
): Promise<CompanyIntelResult> {
  const defaultResult: CompanyIntelResult = { companyInfo: {}, contacts: [] };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildCompanyIntelPrompt(company, jobTitle, userSchool),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return parseJsonObject<CompanyIntelResult>(text, defaultResult);
  } catch (err) {
    logger.error("Claude company intel failed", { error: (err as Error).message, company });
    return defaultResult;
  }
}

function buildCompanyIntelPrompt(company: string, jobTitle: string, school?: string): string {
  return `Research the company "${company}" for a candidate applying for a "${jobTitle}" role.

${school ? `The candidate attended: ${school}` : ""}

Return ONLY a valid JSON object with this structure, no other text:
{
  "companyInfo": {
    "size": "startup|small|mid|large|enterprise",
    "industry": "industry name",
    "description": "1-2 sentence company description",
    "founded": "year or approximate",
    "headquarters": "city, state/country"
  },
  "contacts": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "relationshipType": "CEO|CTO|VP_ENGINEERING|ENGINEERING_MANAGER|HR_RECRUITER|HIRING_MANAGER|EMPLOYEE|ALUMNI|OTHER",
      "outreachPriority": <1-10, higher = reach out first>,
      "isAlumni": <true if attended same school as candidate>,
      "alumniSchool": "school name if alumni",
      "profileSummary": "1 sentence about why they're worth contacting"
    }
  ]
}

Priority order for contacts: Alumni (10) > HR/Recruiter (8) > Hiring Manager (7) > Engineering Manager (6) > CTO/VP Eng (5) > CEO (4) > Employee (3).
Include 3-5 realistic contacts. If you don't know real names, generate plausible ones for the company.`;
}

// ─── Email Classification ─────────────────────────────────────────────────────

export interface EmailClassification {
  isJobRelated: boolean;
  company?: string;
  detectedStatus?: string;
  confidence: number;
}

export async function classifyEmail(
  client: Anthropic,
  model: string,
  subject: string,
  sender: string,
  bodySnippet: string
): Promise<EmailClassification> {
  const defaultResult: EmailClassification = { isJobRelated: false, confidence: 0 };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: buildEmailClassifyPrompt(subject, sender, bodySnippet),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return parseJsonObject<EmailClassification>(text, defaultResult);
  } catch (err) {
    logger.error("Claude email classify failed", { error: (err as Error).message });
    return defaultResult;
  }
}

function buildEmailClassifyPrompt(subject: string, sender: string, body: string): string {
  return `Classify this email as job-application related or not.

Subject: ${subject}
From: ${sender}
Body snippet: ${body.slice(0, 500)}

Return ONLY a valid JSON object, no other text:
{
  "isJobRelated": <true/false>,
  "company": <"company name" or null>,
  "detectedStatus": <"APPLIED"|"PHONE_SCREEN"|"INTERVIEW"|"OFFER"|"REJECTED"|null>,
  "confidence": <0.0-1.0>
}

Status detection rules:
- APPLIED: application received/confirmation
- PHONE_SCREEN: phone screen scheduled/invite
- INTERVIEW: interview scheduled/invite
- OFFER: job offer received
- REJECTED: rejected/not moving forward/position filled`;
}

// ─── Outreach Draft Generation ────────────────────────────────────────────────

export async function generateOutreachDraft(
  client: Anthropic,
  model: string,
  type: "EMAIL" | "LINKEDIN",
  contact: { name: string; title: string; company: string },
  jobTitle: string,
  candidateName: string,
  resumeSummary: string
): Promise<{ subject?: string; content: string }> {
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildOutreachPrompt(type, contact, jobTitle, candidateName, resumeSummary),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return parseJsonObject<{ subject?: string; content: string }>(text, { content: text });
  } catch (err) {
    logger.error("Claude outreach generation failed", { error: (err as Error).message });
    return { content: "" };
  }
}

function buildOutreachPrompt(
  type: "EMAIL" | "LINKEDIN",
  contact: { name: string; title: string; company: string },
  jobTitle: string,
  candidateName: string,
  resumeSummary: string
): string {
  const isLinkedIn = type === "LINKEDIN";
  return `Write a personalized ${isLinkedIn ? "LinkedIn connection note (max 200 chars)" : "cold email"} for a job seeker.

CANDIDATE: ${candidateName}
CANDIDATE SUMMARY: ${resumeSummary.slice(0, 500)}
CONTACT: ${contact.name}, ${contact.title} at ${contact.company}
APPLYING FOR: ${jobTitle}

Return ONLY a valid JSON object, no other text:
${
  isLinkedIn
    ? `{ "content": "<linkedin note under 200 chars, warm and professional>" }`
    : `{ "subject": "<compelling email subject>", "content": "<3-4 paragraph cold email, personalized to their role, specific about the position, ends with clear CTA>" }`
}`;
}

// ─── JSON parsing helpers ────────────────────────────────────────────────────

function parseJsonArray<T>(text: string, fallback: T[]): T[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return fallback;
    return JSON.parse(match[0]) as T[];
  } catch {
    return fallback;
  }
}

function parseJsonObject<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}
