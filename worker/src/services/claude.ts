import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "@jobpilot/shared/encryption";
import { logger } from "../lib/logger";
import type { DiscoveredJob, MatchAnalysisResult } from "@jobpilot/shared/types";

// ─── Client factory ───────────────────────────────────────────────────────────

export function createClaudeClient(encryptedKey: string, iv: string): Anthropic {
  const apiKey = decrypt(encryptedKey, iv);
  return new Anthropic({ apiKey });
}

// ─── Job Search (with real web search) ───────────────────────────────────────

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
  resumeSummary: string,
  resumeKeywords: string[] = []
): Promise<DiscoveredJob[]> {
  const prompt = buildJobSearchPrompt(preferences, resumeSummary, resumeKeywords);

  // Multi-turn loop: handle web_search tool calls from Claude
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let iterations = 0;
  const MAX_ITERATIONS = 10; // Allow up to 10 web searches

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        // Declare the built-in Anthropic web search tool
        tools: [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search" }],
        messages,
      });

      logger.info("Claude response", {
        stop_reason: response.stop_reason,
        contentBlocks: response.content.length,
        iteration: iterations,
      });

      if (response.stop_reason === "end_turn") {
        // Final response — extract text and parse jobs
        const text = response.content.find((b) => b.type === "text")?.text ?? "";
        const jobs = parseDiscoveredJobs(text);
        logger.info("Jobs parsed from Claude", { count: jobs.length });
        return jobs;
      }

      if (response.stop_reason === "tool_use") {
        // Claude wants to call web_search — add its response to the conversation
        messages.push({ role: "assistant", content: response.content });

        // For the built-in web_search_20250305, Anthropic handles execution server-side.
        // We send back tool_result blocks with empty content — Anthropic populates them.
        const toolResults: Anthropic.ToolResultBlockParam[] = response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: "",
          }));

        if (toolResults.length > 0) {
          messages.push({ role: "user", content: toolResults });
        }
        continue;
      }

      // Unexpected stop reason — break and parse whatever we have
      break;
    }

    // Fallback: parse last text block in messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        const text = (msg.content as Anthropic.ContentBlock[]).find((b) => b.type === "text")?.text ?? "";
        if (text) return parseDiscoveredJobs(text);
      }
    }

    return [];
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
  resume: string,
  keywords: string[]
): string {
  const titlesStr = prefs.targetTitles.slice(0, 6).join(", ");
  const locStr = prefs.targetLocations.slice(0, 3).join(", ") || "United States";
  const keywordsStr = keywords.slice(0, 20).join(", ");
  const isRemote = prefs.remotePreference === "remote" || prefs.remotePreference === "any";

  // Build varied search queries to maximize job board coverage
  const searchQueries = [
    `${prefs.targetTitles[0]} jobs ${isRemote ? "remote" : locStr} site:linkedin.com/jobs`,
    `${prefs.targetTitles[0]} ${prefs.experienceLevel} level jobs ${isRemote ? "remote" : locStr} site:indeed.com`,
    prefs.targetTitles[1]
      ? `${prefs.targetTitles[1]} jobs ${isRemote ? "remote" : locStr} site:glassdoor.com`
      : `${prefs.targetTitles[0]} jobs ${locStr} -site:linkedin.com -site:indeed.com`,
    `${prefs.targetTitles[0]} ${prefs.experienceLevel} hiring 2025`,
  ];

  return `You are a job search agent. Your task is to find REAL, currently open job listings that match this candidate.

CANDIDATE PROFILE:
${resume.slice(0, 1500)}

KEY SKILLS: ${keywordsStr || prefs.keywords.join(", ")}

SEARCH CRITERIA:
- Job titles: ${titlesStr}
- Locations: ${locStr}
- Remote preference: ${prefs.remotePreference}
- Experience level: ${prefs.experienceLevel}
${prefs.salaryMin ? `- Minimum salary: $${prefs.salaryMin.toLocaleString()}` : ""}
${prefs.excludeCompanies.length ? `- EXCLUDE these companies: ${prefs.excludeCompanies.join(", ")}` : ""}

INSTRUCTIONS:
1. Use the web_search tool to search for REAL currently posted jobs. Try these search queries (one at a time):
${searchQueries.map((q, i) => `   Query ${i + 1}: "${q}"`).join("\n")}

2. Also search: "${titlesStr} jobs posted this week"

3. For each job found, extract:
   - The EXACT job title as posted
   - Company name
   - Location (city/state or "Remote")
   - The ACTUAL application URL (LinkedIn job URL, Indeed job URL, or company career page URL)
   - Salary range if mentioned
   - Date posted
   - First 400 characters of the job description

4. Only include jobs:
   - Posted within the last 14 days
   - Located in US or remote/worldwide
   - That genuinely match the candidate's profile

5. After ALL searches are complete, output ONLY a JSON array:
[
  {
    "title": "exact job title from posting",
    "company": "company name",
    "location": "city, state OR Remote",
    "url": "https://actual-job-posting-url.com",
    "source": "linkedin|indeed|glassdoor|wellfound|company_site|other",
    "salaryRange": "$X,000 - $Y,000 OR null",
    "postedDate": "YYYY-MM-DD",
    "description": "first 400 chars of job description"
  }
]

Find 15-25 real jobs. Use REAL URLs only — do not make up URLs.`;
}

// ─── Parse Claude's text response into DiscoveredJob[] ────────────────────────

function parseDiscoveredJobs(text: string): DiscoveredJob[] {
  try {
    // Find JSON array in the response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]) as DiscoveredJob[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((j) => j && j.title && j.company && j.url)
      .filter((j) => {
        // Filter out clearly fake/example URLs
        const url = j.url.toLowerCase();
        return (
          url.startsWith("http") &&
          !url.includes("example.com") &&
          !url.includes("placeholder") &&
          !url.includes("yourcompany") &&
          url.length > 20
        );
      })
      .map((j) => ({
        title: String(j.title).trim(),
        company: String(j.company).trim(),
        location: String(j.location || "Remote").trim(),
        url: String(j.url).trim(),
        source: String(j.source || "ai_search").trim(),
        salaryRange: j.salaryRange ? String(j.salaryRange) : undefined,
        postedDate: j.postedDate ? String(j.postedDate) : undefined,
        description: j.description ? String(j.description).slice(0, 2000) : undefined,
      }));
  } catch {
    return [];
  }
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

Return ONLY a valid JSON object, no other text:
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

Priority: Alumni (10) > HR/Recruiter (8) > Hiring Manager (7) > Engineering Manager (6) > CTO/VP (5) > CEO (4).
Include 3-5 contacts.`;
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
}`;
}

// ─── Outreach Draft ────────────────────────────────────────────────────────────

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
    : `{ "subject": "<compelling email subject>", "content": "<3-4 paragraph cold email, personalized, specific, ends with clear CTA>" }`
}`;
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function parseJsonObject<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}
