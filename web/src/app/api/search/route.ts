import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { buildSearchTitles } from "@/lib/resume-analyzer";
import { computeMatchScore } from "@/lib/job-matcher";

export const maxDuration = 120;

// Max age of job posting to include (12 days)
const MAX_JOB_AGE_DAYS = 12;

// ─── Location filtering ───────────────────────────────────────────────────────

const US_INDICATORS = [
  "united states","usa","u.s.","u.s.a",
  "remote","anywhere","flexible / remote","work from home","worldwide",
  "new york","san francisco","seattle","austin","boston","chicago",
  "los angeles","denver","atlanta","miami","dallas","washington",
  "portland","phoenix","minneapolis","detroit","philadelphia","raleigh",
  "remote (us)","remote us","us only","north america",
  " ca,"," ny,"," tx,"," wa,"," co,"," il,"," fl,"," ga,",
];

const NON_US_INDICATORS = [
  // Countries
  "germany","deutschland","united kingdom","france","india","canada",
  "australia","netherlands","singapore","poland","spain","italy",
  "sweden","norway","denmark","finland","brazil","mexico","argentina",
  "japan","china","korea","israel","switzerland","austria","belgium",
  "portugal","ireland","czech","romania","ukraine","turkey","russia",
  // German cities
  "berlin","munich","münchen","hamburg","frankfurt","cologne","köln",
  "düsseldorf","dusseldorf","stuttgart","dortmund","essen","bremen",
  "leipzig","dresden","hannover","hanover","nuremberg","nürnberg",
  "mannheim","augsburg","wiesbaden","bochum","wuppertal","bielefeld",
  "bonn","münster","karlsruhe","hürth","weilheim","kürten","aachen",
  // UK cities
  "london","manchester","birmingham","leeds","glasgow","edinburgh",
  // Other European
  "paris","amsterdam","barcelona","madrid","rome","milan","dublin",
  "stockholm","oslo","copenhagen","helsinki","zurich","vienna","warsaw",
  // Asian
  "tokyo","bangalore","delhi","mumbai","hyderabad","beijing","shanghai",
  "hong kong","taipei","seoul","jakarta","kuala lumpur","sydney","melbourne",
];

// German/non-English title patterns
const NON_ENGLISH_JOB_PATTERNS = [
  "(m/w/d)","(m/f/d)","(w/m/d)","gmbh","stellvertretender",
  "niederlassungsleiter","werkstudent","praktikant","ausbildung",
  "duales studium","büroassistenz","industriekauffrau","projektkostencontroller",
  "terminierer","callseller","pflege","servicetechniker","buchhalter",
];

function isUSOrRemoteJob(location: string, title: string): boolean {
  const loc = (location ?? "").toLowerCase().trim();
  const titleL = (title ?? "").toLowerCase();

  if (NON_ENGLISH_JOB_PATTERNS.some((p) => titleL.includes(p))) return false;
  if (NON_US_INDICATORS.some((kw) => loc.includes(kw))) return false;
  if (loc.includes("remote") || loc.includes("anywhere") || loc.includes("flexible") || loc.includes("worldwide")) return true;
  if (US_INDICATORS.some((kw) => loc.includes(kw))) return true;
  if (!loc || loc === "unspecified") return true;
  return false;
}

// ─── Date filtering ───────────────────────────────────────────────────────────

function isRecentJob(postedDate: string | undefined): boolean {
  if (!postedDate) return true; // No date info → include (can't filter)
  try {
    const posted = new Date(postedDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_JOB_AGE_DAYS);
    return posted >= cutoff;
  } catch {
    return true; // Parse failure → include
  }
}

// ─── Stored analysis type ─────────────────────────────────────────────────────

interface StoredAnalysis {
  domain?: string;
  keywords: string[];
  skills: string[];
  softSkills?: string[];
  jobTitles: string[];
  experienceLevel: "intern" | "entry" | "mid" | "senior" | "executive";
  industries: string[];
  yearsOfExperience: number;
}

// ─── Resume profile (built from stored AI analysis or fallback) ───────────────

interface ResumeProfile {
  resumeKeywords: Set<string>;  // All words from resume for matching
  aiKeywords: string[];         // AI-extracted semantic keywords
  aiJobTitles: string[];        // AI-determined suitable job titles
  titles: string[];             // Job titles to search for
  experienceLevel: string;
  domain?: string;              // AI-detected professional domain
}

function buildResumeText(resume: {
  parsedContent?: string | null;
  summary?: string | null;
  skills?: unknown;
  experience?: unknown;
  projects?: unknown;
} | null): string {
  if (!resume) return "";
  const parts: string[] = [];
  if (resume.parsedContent) parts.push(resume.parsedContent);
  if (resume.summary) parts.push(resume.summary);
  if (resume.skills && typeof resume.skills === "object") {
    for (const val of Object.values(resume.skills as Record<string, unknown>)) {
      if (Array.isArray(val)) parts.push(val.join(" "));
    }
  }
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience as Record<string, unknown>[]) {
      if (exp.title) parts.push(String(exp.title));
      if (exp.company) parts.push(String(exp.company));
      if (Array.isArray(exp.bullets)) parts.push((exp.bullets as string[]).join(" "));
    }
  }
  if (Array.isArray(resume.projects)) {
    for (const p of resume.projects as Record<string, unknown>[]) {
      if (p.description) parts.push(String(p.description));
      if (Array.isArray(p.tech)) parts.push((p.tech as string[]).join(" "));
      if (Array.isArray(p.bullets)) parts.push((p.bullets as string[]).join(" "));
    }
  }
  return parts.filter(Boolean).join("\n");
}

function buildResumeProfile(
  resume: { parsedContent?: string | null; summary?: string | null; skills?: unknown; experience?: unknown; projects?: unknown; customSections?: unknown } | null,
  storedAnalysis: StoredAnalysis | null,
  prefTitles: string[],
  prefExperienceLevel: string
): ResumeProfile {
  // Build raw text keyword set from resume for broad matching
  const resumeText = buildResumeText(resume);
  const stopWords = new Set(["the","and","or","in","at","for","to","of","a","an","with","on","is","was","are","were","be","been","have","has","had","i","my","we","you","by","as","from","this","that","it","its","than","more","also","within","using","during","through","about","each","all","both","per","our","their","his","her"]);
  const resumeKeywords = new Set(
    resumeText.toLowerCase().replace(/[^a-z0-9\s+#./]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );

  // If we have stored AI analysis, use its extracted keywords and job titles
  if (storedAnalysis && storedAnalysis.keywords?.length > 0) {
    // Add AI keywords to the keyword set for better matching
    for (const kw of storedAnalysis.keywords) {
      resumeKeywords.add(kw.toLowerCase());
    }
    for (const sk of storedAnalysis.skills ?? []) {
      resumeKeywords.add(sk.toLowerCase());
    }

    // Use AI-determined job titles for search (much smarter than hardcoded expansion)
    const searchTitles = [
      ...storedAnalysis.jobTitles,
      ...prefTitles,
    ].filter(Boolean);

    return {
      resumeKeywords,
      aiKeywords: storedAnalysis.keywords,
      aiJobTitles: storedAnalysis.jobTitles ?? [],
      titles: Array.from(new Set(searchTitles)),
      experienceLevel: storedAnalysis.experienceLevel ?? prefExperienceLevel,
      domain: storedAnalysis.domain,
    };
  }

  // Fallback: build title list from preferences + basic text scanning
  console.log("[search] No stored AI analysis — using text-based fallback");
  const lower = resumeText.toLowerCase();
  const rawTitles = prefTitles.length > 0 ? prefTitles : ["Software Engineer"];
  const titles: string[] = [];
  for (const t of rawTitles) {
    titles.push(t);
    const tl = t.toLowerCase();
    if (tl.includes("software") || tl.includes("engineer") || tl.includes("developer")) {
      titles.push("Software Engineer", "Software Developer");
      if (lower.includes("backend") || lower.includes("back-end")) titles.push("Backend Engineer", "Backend Developer");
      if (lower.includes("python")) titles.push("Python Developer");
      if (lower.includes("node") || lower.includes("javascript")) titles.push("Node.js Developer");
      if (lower.includes("fullstack") || lower.includes("full-stack") || lower.includes("full stack")) titles.push("Full Stack Engineer");
      if (lower.includes("ros") || lower.includes("robotics")) titles.push("Robotics Software Engineer");
      if (lower.includes("machine learning") || lower.includes("deep learning")) titles.push("ML Engineer");
    }
  }
  titles.push("Engineer", "Developer");

  return {
    resumeKeywords,
    aiKeywords: [],
    aiJobTitles: prefTitles,
    titles: Array.from(new Set(titles)),
    experienceLevel: prefExperienceLevel,
    domain: undefined,
  };
}

// ─── Claude web search ────────────────────────────────────────────────────────

async function searchWithClaude(
  apiKey: string,
  model: string,
  preferences: { targetTitles: string[]; targetLocations: string[]; remotePreference: string; experienceLevel: string; industries: string[]; keywords: string[]; salaryMin?: number | null; excludeCompanies: string[] },
  resume: { parsedContent?: string | null; summary?: string | null; skills?: unknown; customSections?: unknown } | null,
  storedAnalysis: StoredAnalysis | null
): Promise<RawJob[]> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    // Build resume summary
    const summaryParts: string[] = [];
    if (resume?.parsedContent) summaryParts.push(resume.parsedContent.slice(0, 1500));
    else if (resume?.summary) summaryParts.push(resume.summary);
    const resumeSummary = summaryParts.join("\n") || "Professional candidate";

    // Get keywords from stored analysis
    const keywords = [
      ...(storedAnalysis?.keywords ?? []),
      ...(storedAnalysis?.skills ?? []),
    ].slice(0, 30);

    // Build prompt
    const titlesStr = preferences.targetTitles.slice(0, 5).join(", ");
    const locStr = preferences.targetLocations.slice(0, 2).join(", ") || "United States";
    const isRemote = preferences.remotePreference === "remote" || preferences.remotePreference === "any";

    const prompt = `You are a job search agent. Search the web to find REAL, currently open job listings for this candidate.

CANDIDATE PROFILE:
${resumeSummary}

KEY SKILLS: ${keywords.join(", ")}

SEARCH CRITERIA:
- Titles: ${titlesStr}
- Location: ${locStr}
- Remote: ${preferences.remotePreference}
- Experience: ${preferences.experienceLevel}
${preferences.salaryMin ? `- Min salary: $${preferences.salaryMin.toLocaleString()}` : ""}
${preferences.excludeCompanies.length ? `- Exclude: ${preferences.excludeCompanies.join(", ")}` : ""}

Search for jobs using these queries (run each search separately):
1. "${preferences.targetTitles[0]} jobs ${isRemote ? "remote" : locStr} site:linkedin.com/jobs"
2. "${preferences.targetTitles[0]} ${preferences.experienceLevel} jobs ${isRemote ? "remote" : locStr} site:indeed.com"
3. "${preferences.targetTitles[1] ?? preferences.targetTitles[0]} jobs ${locStr} 2025"
4. "${titlesStr} hiring ${isRemote ? "remote" : locStr}"

Find 15-25 REAL job postings. After searching, output ONLY this JSON array:
[{"title":"...","company":"...","location":"...","url":"https://real-url.com","source":"linkedin|indeed|glassdoor|other","salaryRange":"$X-$Y or null","postedDate":"YYYY-MM-DD","description":"first 300 chars"}]

Only include jobs with REAL URLs from actual job boards. Do not make up URLs.`;

    const messages: { role: "user" | "assistant"; content: unknown }[] = [
      { role: "user", content: prompt },
    ];

    let iterations = 0;
    while (iterations < 10) {
      iterations++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        tools: [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search" }],
        messages: messages as Parameters<typeof client.messages.create>[0]["messages"],
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content.find((b) => b.type === "text")?.text ?? "";
        return parseClaudeJobs(text);
      }

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });
        const toolResults = response.content
          .filter((b) => b.type === "tool_use")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b) => ({ type: "tool_result" as const, tool_use_id: (b as any).id as string, content: "" }));
        if (toolResults.length > 0) {
          messages.push({ role: "user", content: toolResults });
        }
        continue;
      }
      break;
    }
    return [];
  } catch (err) {
    console.error("[search] Claude web search error:", (err as Error).message);
    return [];
  }
}

function parseClaudeJobs(text: string): RawJob[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as RawJob[];
    return parsed
      .filter((j) => j?.url && j?.title && j?.company)
      .filter((j) => {
        const url = j.url.toLowerCase();
        return url.startsWith("http") && !url.includes("example.com") && url.length > 20;
      })
      .map((j) => ({
        title: String(j.title).trim(),
        company: String(j.company).trim(),
        location: String(j.location || "Remote").trim(),
        url: String(j.url).trim(),
        description: j.description ? String(j.description).slice(0, 5000) : "",
        source: String(j.source || "claude_search"),
        salaryRange: j.salaryRange ?? undefined,
        postedDate: j.postedDate ?? undefined,
      }));
  } catch {
    return [];
  }
}

// ─── Job board fetchers ───────────────────────────────────────────────────────

interface RawJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string;
  salaryRange?: string;
  postedDate?: string;
}

async function fetchRemotiveJobs(titles: string[]): Promise<RawJob[]> {
  const results: RawJob[] = [];
  const queries = titles.filter((t) => !["Engineer", "Developer"].includes(t)).slice(0, 4);
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=15`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of data.jobs ?? []) {
        results.push({
          title: j.title ?? "",
          company: j.company_name ?? "",
          location: j.candidate_required_location || "Remote",
          url: j.url ?? "",
          description: stripHtml(j.description ?? "").slice(0, 5000),
          source: "remotive",
          salaryRange: j.salary || undefined,
          postedDate: j.published_on || undefined,
        });
      }
    } catch { /* skip */ }
  }
  return results;
}

async function fetchMuseJobs(titles: string[]): Promise<RawJob[]> {
  try {
    const category = mapTitleToMuseCategory(titles[0] ?? "");
    const res = await fetch(
      `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(category)}&location=United%20States&page=0&descending=true`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).slice(0, 30).map((j: Record<string, unknown>) => ({
      title: (j.name as string) ?? "",
      company: (j.company as { name: string })?.name ?? "",
      location: (j.locations as { name: string }[])?.[0]?.name ?? "United States",
      url: (j.refs as { landing_page: string })?.landing_page ?? "",
      description: stripHtml((j.contents as string) ?? "").slice(0, 5000),
      source: "the-muse",
      postedDate: (j.publication_date as string) || undefined,
    })).filter((j: RawJob) => j.url && j.title);
  } catch {
    return [];
  }
}

async function fetchJobicyJobs(titles: string[]): Promise<RawJob[]> {
  const results: RawJob[] = [];
  const queries = titles.filter((t) => !["Engineer", "Developer"].includes(t)).slice(0, 2);
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://jobicy.com/api/v2/remote-jobs?count=15&tag=${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of (data.jobs ?? [])) {
        results.push({
          title: j.jobTitle ?? "",
          company: j.companyName ?? "",
          location: j.jobGeo || "Remote",
          url: j.url ?? "",
          description: stripHtml(j.jobExcerpt ?? "").slice(0, 5000),
          source: "jobicy",
          postedDate: j.pubDate || undefined,
        });
      }
    } catch { /* skip */ }
  }
  return results;
}

// ─── Main POST handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const searchRunId: string | undefined = body.searchRunId;

  const [preferences, masterResume, apiConfig] = await Promise.all([
    prisma.jobPreferences.findUnique({ where: { userId } }),
    prisma.resume.findFirst({
      where: { userId, isMaster: true },
      select: { parsedContent: true, summary: true, skills: true, experience: true, education: true, projects: true, customSections: true },
    }).then(async (r) => r ?? prisma.resume.findFirst({
      where: { userId },
      select: { parsedContent: true, summary: true, skills: true, experience: true, education: true, projects: true, customSections: true },
    })),
    prisma.userApiConfig.findUnique({
      where: { userId },
      select: {
        searchDepth: true,
        claudeApiKeyEncrypted: true,
        claudeApiKeyIv: true,
        researchModel: true,
        executionModel: true,
      },
    }),
  ]);

  if (!preferences) {
    return NextResponse.json({ error: "No job preferences configured." }, { status: 400 });
  }

  // Extract stored AI analysis from resume's customSections
  const customSections = masterResume?.customSections as Record<string, unknown> | null;
  const storedAnalysis = (customSections?._analysis as StoredAnalysis) ?? null;

  if (storedAnalysis) {
    console.log(`[search] Using stored AI analysis: domain="${storedAnalysis.domain ?? "?"}", ${storedAnalysis.keywords?.length ?? 0} keywords, ${storedAnalysis.jobTitles?.length ?? 0} job titles`);
  } else {
    console.log("[search] No stored analysis — falling back to algorithmic extraction");
  }

  let runId = searchRunId;
  if (runId) {
    await prisma.searchRun.update({ where: { id: runId }, data: { status: "RUNNING", startedAt: new Date() } });
  } else {
    const run = await prisma.searchRun.create({
      data: { userId, searchDepth: apiConfig?.searchDepth ?? "STANDARD", status: "RUNNING", startedAt: new Date() },
    });
    runId = run.id;
  }

  try {
    const profile = buildResumeProfile(masterResume, storedAnalysis, preferences.targetTitles, preferences.experienceLevel);

    // Use buildSearchTitles to get smart, preference-aware search titles
    profile.titles = buildSearchTitles(
      { targetTitles: preferences.targetTitles, experienceLevel: preferences.experienceLevel },
      storedAnalysis as Parameters<typeof buildSearchTitles>[1]
    );

    console.log("[search] Search titles:", profile.titles);
    console.log("[search] AI keywords:", profile.aiKeywords.slice(0, 10));
    console.log("[search] Experience level:", profile.experienceLevel);

    // ── Try Claude web search (use server API key from env) ────────────────
    let allJobs: RawJob[] = [];
    const serverApiKey = process.env.CLAUDE_API_KEY;

    if (serverApiKey) {
      console.log("[search] Using server Claude API key for web search");
      const claudeJobs = await searchWithClaude(
        serverApiKey,
        apiConfig?.researchModel ?? "claude-sonnet-4-6",
        preferences,
        masterResume,
        storedAnalysis
      );
      allJobs = claudeJobs;
      console.log(`[search] Claude web search returned ${allJobs.length} jobs`);
    }

    // ── Fall back to free APIs if Claude search returned nothing ───────────
    let usingFreeApis = false;
    if (allJobs.length < 5) {
      console.log(`[search] ${serverApiKey ? "Claude returned too few results — " : "No server API key — "}using free job board APIs`);
      usingFreeApis = true;
      const [remotive, muse, jobicy] = await Promise.all([
        fetchRemotiveJobs(profile.titles),
        fetchMuseJobs(profile.titles),
        fetchJobicyJobs(profile.titles),
      ]);
      const freeJobs = [...remotive, ...muse, ...jobicy];
      // Merge — Claude results first, then free API results
      allJobs = [...allJobs, ...freeJobs];
    }

    console.log(`[search] Total raw jobs: ${allJobs.length}`);

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allJobs.filter((j) => {
      if (!j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    });

    // Filter to US/Remote + English jobs only
    const usJobs = unique.filter((j) => isUSOrRemoteJob(j.location, j.title));
    console.log(`[search] After location filter: ${usJobs.length} / ${unique.length} jobs`);

    // Date filter: only apply to Claude results (they have real posted dates).
    // Free API boards (Remotive, Muse, Jobicy) often have stale postedDate fields.
    const recentJobs = usingFreeApis
      ? usJobs
      : usJobs.filter((j) => isRecentJob(j.postedDate));
    console.log(`[search] After date filter: ${recentJobs.length} / ${usJobs.length} jobs`);

    // Score and rank
    const scored = recentJobs
      .map((j) => {
        const match = computeMatchScore(j, {
          resumeSkills: profile.resumeKeywords,
          aiKeywords: profile.aiKeywords,
          aiJobTitles: profile.aiJobTitles,
          targetTitles: preferences.targetTitles,
          experienceLevel: profile.experienceLevel,
          domain: profile.domain,
        });
        return { ...j, ...match };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    console.log("[search] Top 5:", scored.slice(0, 5).map((j) => `${j.score}% ${j.title} @ ${j.company}`));

    // Save to DB
    let savedCount = 0;
    for (const job of scored) {
      const existing = await prisma.job.findUnique({
        where: { userId_url: { userId, url: job.url } },
      });
      if (existing) continue;

      await prisma.job.create({
        data: {
          userId,
          searchRunId: runId,
          title: job.title,
          company: job.company,
          location: job.location || null,
          url: job.url,
          source: job.source,
          description: job.description || null,
          salaryRange: job.salaryRange || null,
          matchScore: job.score,
          missingKeywords: job.missingKeywords,
          matchAnalysis: {
            titleMatch: job.titleMatch,
            skillsMatch: job.skillsMatch,
            experienceMatch: job.experienceMatch,
            requiredCoverage: job.requiredCoverage,
            preferredCoverage: job.preferredCoverage,
            matchedKeywords: job.matchedKeywords,
            missingKeywords: job.missingKeywords,
            details: job.details,
          },
          status: "DISCOVERED",
        },
      });
      savedCount++;
    }

    await prisma.searchRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", completedAt: new Date(), jobsFound: savedCount, jobsMatched: savedCount, apiCalls: 3 },
    });

    return NextResponse.json({
      success: true,
      jobsFound: savedCount,
      searchRunId: runId,
    });
  } catch (err) {
    console.error("Search error:", err);
    const raw = err instanceof Error ? err.message : String(err);
    await prisma.searchRun.update({ where: { id: runId! }, data: { status: "FAILED", completedAt: new Date(), errorLog: raw } });
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

// GET: poll status
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const runId = new URL(req.url).searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "Missing runId" }, { status: 400 });
  const run = await prisma.searchRun.findFirst({
    where: { id: runId, userId: session.user.id },
    select: { status: true, jobsFound: true, startedAt: true, completedAt: true, errorLog: true },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapTitleToMuseCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("data") || t.includes("machine learning") || t.includes("ml")) return "Data Science";
  if (t.includes("design") || t.includes("ux")) return "Design & UX";
  if (t.includes("product manager")) return "Product";
  if (t.includes("devops") || t.includes("infra") || t.includes("cloud") || t.includes("sre")) return "IT";
  return "Software Engineer";
}


