/**
 * Job Matcher — high-accuracy resume ↔ job description matching.
 *
 * Scoring model (weighted):
 *   Required skills coverage  40%  ← most critical: do you have what they need?
 *   Title / role alignment    30%  ← is this actually the role you're targeting?
 *   Experience level fit      15%  ← are you the right seniority?
 *   Preferred skills + domain 15%  ← bonus relevance signals
 */

// ─── Skill alias groups ────────────────────────────────────────────────────────
// Each inner array is a group of equivalent terms (all lowercase).
// If a job requires "k8s" and the resume has "kubernetes" → MATCH.

const SKILL_GROUPS: string[][] = [
  // ── JavaScript ecosystem ──
  ["javascript", "js", "ecmascript", "es6", "es2015", "es2020", "vanilla js"],
  ["typescript", "ts"],
  ["node.js", "nodejs", "node js", "node"],
  ["react", "react.js", "reactjs", "react js"],
  ["next.js", "nextjs", "next js"],
  ["vue", "vue.js", "vuejs", "vue js"],
  ["angular", "angularjs", "angular.js"],
  ["svelte", "svelte.js"],
  ["jquery", "jquery.js"],
  // ── Backend ──
  ["python", "py"],
  ["golang", "go lang"],  // note: "go" alone not included — too ambiguous
  ["c++", "cpp", "c plus plus"],
  ["c#", "csharp", "c sharp", "dotnet c#", ".net c#"],
  ["java", "java se", "java ee"],
  ["ruby", "ruby on rails", "rails"],
  ["php", "php 8"],
  ["rust", "rust lang"],
  ["scala", "scala lang"],
  ["kotlin", "kotlin jvm"],
  ["swift", "swift ios"],
  ["r", "r programming", "r language"],  // data science R
  // ── Frameworks ──
  ["django", "django rest framework", "drf"],
  ["flask", "flask python"],
  ["fastapi", "fast api"],
  ["spring boot", "spring framework", "spring"],
  ["express.js", "expressjs", "express js", "express"],
  ["graphql", "graph ql"],
  ["rest api", "restful api", "rest apis", "restful apis"],
  ["grpc", "grpc protocol"],
  // ── Databases ──
  ["postgresql", "postgres", "psql", "pg"],
  ["mysql", "my sql"],
  ["mongodb", "mongo", "mongo db"],
  ["redis", "redis cache"],
  ["elasticsearch", "elastic search", "opensearch"],
  ["sqlite", "sql lite"],
  ["cassandra", "apache cassandra"],
  ["dynamodb", "dynamo db", "aws dynamodb"],
  ["sql server", "mssql", "microsoft sql server", "t-sql"],
  ["oracle db", "oracle database", "oracle sql"],
  // ── Cloud ──
  ["aws", "amazon web services", "amazon aws"],
  ["gcp", "google cloud", "google cloud platform"],
  ["azure", "microsoft azure", "azure cloud"],
  ["terraform", "hashicorp terraform"],
  ["kubernetes", "k8s"],
  ["docker", "docker container", "docker compose"],
  ["helm", "helm charts"],
  // ── DevOps / CI/CD ──
  ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment"],
  ["github actions", "github ci"],
  ["jenkins", "jenkins pipeline"],
  ["gitlab ci", "gitlab ci/cd"],
  ["ansible", "ansible playbook"],
  ["prometheus", "prometheus monitoring"],
  ["grafana", "grafana dashboard"],
  // ── ML / AI ──
  ["machine learning", "ml"],
  ["deep learning", "dl"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
  ["computer vision", "cv"],
  ["tensorflow", "tf", "tensor flow"],
  ["pytorch", "py torch"],
  ["scikit-learn", "sklearn", "scikit learn"],
  ["hugging face", "huggingface", "transformers"],
  ["opencv", "open cv"],
  ["pandas", "pandas library"],
  ["numpy", "num py"],
  // ── Data ──
  ["tableau", "tableau desktop"],
  ["power bi", "powerbi", "microsoft power bi"],
  ["looker", "looker studio", "google looker"],
  ["dbt", "data build tool"],
  ["apache spark", "spark", "pyspark"],
  ["apache kafka", "kafka"],
  ["airflow", "apache airflow"],
  ["snowflake", "snowflake cloud"],
  // ── Frontend tools ──
  ["figma", "figma design"],
  ["adobe xd", "xd design"],
  ["adobe photoshop", "photoshop", "ps"],
  ["adobe illustrator", "illustrator", "ai design"],
  ["tailwind", "tailwind css"],
  ["sass", "scss"],
  ["webpack", "webpack bundler"],
  // ── Mobile ──
  ["react native", "react-native", "rn mobile"],
  ["flutter", "flutter dart"],
  ["swift", "swift ios", "swiftui"],
  ["kotlin", "kotlin android"],
  // ── Security ──
  ["penetration testing", "pen testing", "pentest"],
  ["owasp", "owasp top 10"],
  // ── Marketing ──
  ["seo", "search engine optimization"],
  ["sem", "search engine marketing"],
  ["ppc", "pay per click", "pay-per-click"],
  ["google analytics", "ga4", "google analytics 4"],
  ["google ads", "google adwords"],
  ["facebook ads", "meta ads"],
  ["hubspot", "hub spot"],
  ["salesforce", "sales force", "sfdc"],
  ["marketo", "adobe marketo"],
  // ── Design tools ──
  ["sketch", "sketch app"],
  ["indesign", "adobe indesign"],
  ["after effects", "adobe after effects", "ae"],
  // ── Business systems ──
  ["jira", "atlassian jira"],
  ["confluence", "atlassian confluence"],
  ["slack", "slack app"],
  ["notion", "notion app"],
  ["excel", "microsoft excel", "ms excel", "spreadsheet"],
  ["vba", "excel vba", "visual basic for applications"],
  ["sap", "sap erp", "sap s/4hana"],
  ["quickbooks", "quick books"],
  // ── Healthcare ──
  ["registered nurse", "rn", "r.n."],
  ["electronic health record", "ehr", "emr", "electronic medical record"],
  ["epic", "epic emr", "epic ehr", "epic systems"],
  ["cerner", "cerner ehr"],
  ["basic life support", "bls"],
  ["advanced cardiac life support", "acls"],
  ["pediatric advanced life support", "pals"],
  ["certified nursing assistant", "cna"],
  ["licensed practical nurse", "lpn"],
  ["nurse practitioner", "np"],
  // ── Finance ──
  ["chartered financial analyst", "cfa"],
  ["certified public accountant", "cpa"],
  ["discounted cash flow", "dcf", "dcf analysis"],
  ["leveraged buyout", "lbo", "lbo model"],
  ["bloomberg terminal", "bloomberg"],
  ["python for finance", "quantitative finance"],
  // ── Legal ──
  ["westlaw", "west law"],
  ["lexisnexis", "lexis nexis"],
  ["juris doctor", "jd", "j.d."],
];

// Build lookup: variant → group index
const SKILL_GROUP_MAP = new Map<string, number>();
for (let i = 0; i < SKILL_GROUPS.length; i++) {
  for (const v of SKILL_GROUPS[i]) {
    SKILL_GROUP_MAP.set(v.toLowerCase(), i);
  }
}

// ─── Generic job-description words that are NOT skills ────────────────────────
// These flood the keyword list but have zero signal for skill matching.
const JD_NOISE_WORDS = new Set([
  // Generic verbs
  "develop","design","build","implement","work","create","support","maintain",
  "manage","lead","own","drive","improve","deliver","ensure","provide","use",
  "utilize","leverage","define","execute","collaborate","communicate","document",
  "contribute","participate","write","review","test","debug","deploy","monitor",
  "optimize","scale","architect","integrate","research","analyze","evaluate",
  "identify","understand","apply","learn","grow","mentor","partner",
  // Generic adjectives
  "strong","excellent","good","great","solid","deep","broad","extensive","proven",
  "demonstrated","hands-on","practical","relevant","technical","professional",
  "exceptional","effective","efficient","creative","innovative","motivated","self",
  "passionate","detail","oriented","fast","paced","startup","dynamic","high",
  "quality","performance","large","complex","modern","cutting","edge","world",
  "class","best","clear","clean","concise","thoughtful","thorough","proactive",
  // Generic nouns
  "experience","ability","knowledge","skill","skills","understanding","background",
  "familiarity","proficiency","expertise","exposure","foundation","principles",
  "concepts","practices","methodology","approach","problem","solution","system",
  "systems","service","services","application","applications","code","software",
  "product","products","feature","features","component","components","team",
  "teams","organization","company","business","customer","user","users","data",
  "process","processes","project","projects","environment","infrastructure",
  "platform","architecture","codebase","stack","tools","tool","framework",
  "frameworks","language","languages","library","libraries","database","databases",
  "technology","technologies","program","programming","developer","development",
  "engineering","engineer","candidate","position","role","opportunity","company",
  "join","help","build","make","new","plus","minimum","preferred","required",
  "ability","years","year","including","within","across","using","via",
  "time","day","days","week","weeks","month","months","full","part",
  "results","impact","success","growth","direction","strategy","vision",
  "requirements","qualifications","responsibilities","job","responsibilities",
  // Filler
  "etc","e.g","i.e","e.g.","like","well","just","also","both","some","more",
  "most","very","even","back","way","see","than","then","its","get",
  // Numbers as words
  "one","two","three","four","five","six","seven","eight","nine","ten",
]);

// ─── Check if a skill exists in a resume skill set (alias-aware) ──────────────

export function skillExistsInSet(skill: string, resumeSkills: Set<string>): boolean {
  const sl = skill.toLowerCase().trim();
  if (resumeSkills.has(sl)) return true;

  // Check alias group
  const groupIdx = SKILL_GROUP_MAP.get(sl);
  if (groupIdx !== undefined) {
    for (const variant of SKILL_GROUPS[groupIdx]) {
      if (resumeSkills.has(variant)) return true;
    }
  }

  // Compound match: "react" in resume matches "react.js" in job, "node" matches "node.js"
  if (sl.length >= 3) {
    for (const rk of Array.from(resumeSkills)) {
      if (rk === sl) return true;
      // node ↔ node.js, react ↔ react.js
      if (rk.startsWith(sl + ".") || rk.startsWith(sl + " ")) return true;
      if (sl.startsWith(rk + ".") || sl.startsWith(rk + " ")) return true;
      // "postgresql" ↔ "postgres" (prefix match for db names)
      if (rk.length >= 5 && sl.startsWith(rk) && sl.length <= rk.length + 4) return true;
      if (sl.length >= 5 && rk.startsWith(sl) && rk.length <= sl.length + 4) return true;
    }
  }

  return false;
}

// ─── Extract required and preferred skill sets from a job description ──────────

interface JobRequirements {
  required: string[];   // Must-have skills (high weight)
  preferred: string[];  // Nice-to-have skills (lower weight)
  allKeywords: string[]; // Combined deduped list
}

export function extractJobRequirements(jobText: string): JobRequirements {
  if (!jobText) return { required: [], preferred: [], allKeywords: [] };

  const lower = jobText.toLowerCase();

  // ── Split into required and preferred sections ──
  const requiredSectionRx = /(?:requirements?|required\s+(?:qualifications?|skills?|experience)|must[\s-]have|you(?:'ll|\s+will)\s+(?:have|need|bring)|basic\s+qualifications?|minimum\s+qualifications?|what\s+you(?:['']ll|\s+need|\s+bring|\s+have)|technical\s+requirements?)[:\s]*\n([^]*?)(?=\n(?:preferred|nice[\s-]to[\s-]have|bonus|desired|additional|what\s+would|it(?:'s|'d)?\s+be\s+(?:a\s+)?(?:nice|great|plus))|$)/i;

  const preferredSectionRx = /(?:preferred|nice[\s-]to[\s-]have|bonus|desired|it(?:'s|'d)?\s+be\s+(?:a\s+)?(?:nice|great|plus)|additional\s+qualifications?|great\s+to\s+have|would\s+be\s+(?:a\s+)?plus)[:\s]*\n([^]*?)(?:\n\n|$)/i;

  const reqMatch = jobText.match(requiredSectionRx);
  const prefMatch = jobText.match(preferredSectionRx);

  const reqText = reqMatch ? reqMatch[1] : jobText; // fallback: use full text
  const prefText = prefMatch ? prefMatch[1] : "";

  const required = extractSkillsFromText(reqText);
  const preferred = extractSkillsFromText(prefText);

  // Also extract from full text for anything missed
  const allFromFull = extractSkillsFromText(jobText);

  // Combine: required gets all unique from full text, preferred fills in the rest
  const requiredSet = new Set(required);
  const allSet = new Set([...required, ...allFromFull]);

  // Anything in full text but not in required section → add to preferred
  for (const skill of allFromFull) {
    if (!requiredSet.has(skill)) preferred.push(skill);
  }

  const allKeywords = Array.from(allSet);

  return {
    required: Array.from(new Set(required)).slice(0, 60),
    preferred: Array.from(new Set(preferred)).slice(0, 40),
    allKeywords: allKeywords.slice(0, 80),
  };
}

function extractSkillsFromText(text: string): string[] {
  if (!text) return [];

  const skills: string[] = [];
  const lower = text.toLowerCase();

  // 1. ALL CAPS acronyms (AWS, REST, SQL, ROS2, etc.)
  const CAPS_STOP = new Set(["THE","AND","FOR","WITH","YOU","ARE","WAS","HAS","HAVE",
    "BEEN","WILL","CAN","OUR","YOUR","THIS","THAT","NOT","BUT","ALL","ANY","NEW",
    "USE","MAY","INC","LLC","LTD","ROLE","TEAM","WORK","MUST","ABLE","HELP",
    "NEED","JOIN","WHAT","WHEN","WHERE","HOW","WHO"]);
  const capsMatches = text.match(/\b[A-Z][A-Z0-9+#/]{1,12}\b/g) ?? [];
  for (const m of capsMatches) {
    if (!CAPS_STOP.has(m)) skills.push(m.toLowerCase());
  }

  // 2. CamelCase product names (PostgreSQL, TypeScript, JavaScript, HubSpot)
  const camelMatches = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z0-9]+)+\b/g) ?? [];
  for (const m of camelMatches) {
    const ml = m.toLowerCase();
    if (!JD_NOISE_WORDS.has(ml) && ml.length >= 4) skills.push(ml);
  }

  // 3. Capitalized multi-word product names (Google Analytics, Apache Kafka, etc.)
  const multiWordMatches = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z0-9]+)+\b/g) ?? [];
  for (const m of multiWordMatches) {
    const ml = m.toLowerCase();
    if (!JD_NOISE_WORDS.has(ml)) skills.push(ml);
  }

  // 4. Known skill patterns from bullet points (e.g., "• Python", "- React")
  const bulletLines = text.match(/^[\s]*[-•*◆▪·]\s+(.+)$/gm) ?? [];
  for (const line of bulletLines) {
    const content = line.replace(/^[\s]*[-•*◆▪·]\s+/, "").trim();
    // Short lines that are likely just a tech name
    if (content.length < 40 && /^[A-Z]/.test(content)) {
      skills.push(content.toLowerCase());
    }
  }

  // 5. "experience with X" / "proficiency in X" / "knowledge of X" patterns
  const withPatterns = lower.match(
    /(?:experience\s+(?:with|in|using)|proficiency\s+in|knowledge\s+of|expertise\s+in|familiarity\s+with|skilled\s+in|background\s+in)\s+([A-Za-z][A-Za-z0-9\s.+#/-]{1,40}?)(?=[,;\n]|and\s|$)/gi
  ) ?? [];
  for (const m of withPatterns) {
    const extracted = m.replace(/^(?:experience\s+(?:with|in|using)|proficiency\s+in|knowledge\s+of|expertise\s+in|familiarity\s+with|skilled\s+in|background\s+in)\s+/i, "").trim().toLowerCase();
    if (extracted.length >= 2 && extracted.length < 40 && !JD_NOISE_WORDS.has(extracted)) {
      skills.push(extracted);
    }
  }

  // 6. Comma-separated lists in parentheses: "(Python, React, PostgreSQL)"
  const parenMatches = text.match(/\(([A-Za-z0-9,\s.+#/-]{5,100})\)/g) ?? [];
  for (const p of parenMatches) {
    const inner = p.slice(1, -1);
    if (inner.includes(",")) {
      inner.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length >= 2 && s.length < 30 && !JD_NOISE_WORDS.has(s))
        .forEach((s) => skills.push(s));
    }
  }

  // Deduplicate, filter noise, normalize length
  return Array.from(new Set(
    skills
      .map((s) => s.trim().toLowerCase())
      .filter((s) => {
        if (!s || s.length < 2 || s.length > 50) return false;
        if (JD_NOISE_WORDS.has(s)) return false;
        if (/^\d+$/.test(s)) return false;  // pure numbers
        return true;
      })
  ));
}

// ─── Experience level extraction ──────────────────────────────────────────────

interface YearRange {
  min: number;
  max: number;
}

const LEVEL_YEAR_RANGE: Record<string, YearRange> = {
  "intern":    { min: 0,  max: 1  },
  "entry":     { min: 0,  max: 3  },
  "mid":       { min: 2,  max: 6  },
  "senior":    { min: 4,  max: 12 },
  "executive": { min: 8,  max: 99 },
};

function extractYearsRequired(text: string): YearRange | null {
  const patterns: [RegExp, (m: RegExpMatchArray) => YearRange][] = [
    [/(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*(?:years?|yrs?)/i,       (m) => ({ min: +m[1], max: +m[2] })],
    [/(\d+)\s*\+\s*(?:years?|yrs?)/i,                            (m) => ({ min: +m[1], max: 99 })],
    [/(?:minimum|at\s+least|minimum\s+of)\s+(\d+)\s*(?:years?|yrs?)/i, (m) => ({ min: +m[1], max: 99 })],
    [/(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i, (m) => ({ min: +m[1], max: +m[1] + 3 })],
  ];
  for (const [rx, build] of patterns) {
    const m = text.match(rx);
    if (m) return build(m);
  }
  return null;
}

function computeExperienceFit(userLevel: string, jobText: string, jobTitle: string): number {
  const combined = (jobTitle + " " + jobText).toLowerCase();
  const userRange = LEVEL_YEAR_RANGE[userLevel] ?? LEVEL_YEAR_RANGE["entry"]!;
  const jobRange = extractYearsRequired(combined);

  if (jobRange) {
    // Overlap between user's year range and job's year range
    const overlapMin = Math.max(userRange.min, jobRange.min);
    const overlapMax = Math.min(userRange.max, jobRange.max);
    if (overlapMax >= overlapMin) {
      // Good overlap — score based on how centered the user's range is
      return 85 + Math.min(10, overlapMax - overlapMin);
    }
    // No overlap — penalize proportional to how far off
    const gap = overlapMin - overlapMax;
    return Math.max(15, 75 - gap * 15);
  }

  // No year requirement found — use title/description signals
  const lvl = userLevel;

  // Hard overqualification / underqualification signals
  const principalSignals = ["principal engineer","staff engineer","distinguished","fellow"];
  const seniorSignals    = ["senior","sr.","lead engineer","tech lead","engineering lead"];
  const entrySignals     = ["junior","jr.","entry level","entry-level","new grad","recent graduate","early career","associate engineer","0-2 years","0-1 year"];
  const internSignals    = ["intern","internship","co-op","coop","student"];

  const hasPrincipal = principalSignals.some((s) => combined.includes(s));
  const hasSenior    = seniorSignals.some((s) => combined.includes(s));
  const hasEntry     = entrySignals.some((s) => combined.includes(s));
  const hasIntern    = internSignals.some((s) => combined.includes(s));

  if (lvl === "intern" || lvl === "entry") {
    if (hasIntern || hasEntry) return 92;
    if (hasSenior)             return 35;
    if (hasPrincipal)          return 15;
    return 65; // unspecified — reasonable fit
  }
  if (lvl === "mid") {
    if (hasSenior) return 70;   // slight stretch
    if (hasEntry)  return 75;   // slight overqualified but ok
    if (hasIntern) return 30;
    return 75;
  }
  if (lvl === "senior") {
    if (hasPrincipal || hasSenior) return 90;
    if (hasEntry)                  return 55;
    if (hasIntern)                 return 20;
    return 72;
  }
  if (lvl === "executive") {
    if (hasPrincipal || hasSenior) return 85;
    if (hasEntry || hasIntern)     return 35;
    return 70;
  }
  return 65;
}

// ─── Title alignment ──────────────────────────────────────────────────────────

const SENIORITY_PREFIX = /^(senior|sr\.?|junior|jr\.?|lead|staff|principal|associate|mid[\s-]level|entry[\s-]level)\s+/i;

function stripSeniority(title: string): string {
  return title.replace(SENIORITY_PREFIX, "").trim().toLowerCase();
}

// Role family groups — titles in the same group are considered compatible
const ROLE_FAMILIES: string[][] = [
  ["software engineer","software developer","programmer","engineer","developer"],
  ["frontend engineer","frontend developer","ui engineer","web developer","react developer","javascript developer","ui developer"],
  ["backend engineer","backend developer","api engineer","server engineer","node developer","python developer","java developer","go developer"],
  ["full stack engineer","full stack developer","fullstack engineer","fullstack developer"],
  ["devops engineer","platform engineer","site reliability engineer","sre","cloud engineer","infrastructure engineer","devsecops"],
  ["data engineer","etl developer","analytics engineer","big data engineer","data pipeline engineer"],
  ["data scientist","data analyst","ml researcher","applied scientist","research scientist"],
  ["machine learning engineer","ml engineer","ai engineer","deep learning engineer","nlp engineer","computer vision engineer"],
  ["product manager","associate product manager","product owner","technical product manager"],
  ["product designer","ux designer","ui/ux designer","interaction designer","user experience designer"],
  ["graphic designer","visual designer","brand designer","motion designer","creative designer"],
  ["digital marketing specialist","seo specialist","sem specialist","growth marketer","marketing analyst","performance marketer"],
  ["marketing manager","brand manager","campaign manager","marketing coordinator","marketing specialist"],
  ["financial analyst","investment analyst","fp&a analyst","equity research analyst","finance analyst"],
  ["staff accountant","accountant","accounting analyst","audit associate","tax analyst"],
  ["registered nurse","staff nurse","clinical nurse","rn","travel nurse"],
  ["project manager","program manager","scrum master","agile coach","project coordinator"],
  ["sales development representative","account executive","business development representative","sdr","bdr"],
  ["recruiter","talent acquisition specialist","hr coordinator","hr generalist"],
  ["supply chain analyst","logistics coordinator","procurement analyst","operations analyst"],
  ["data science","machine learning"],  // overlapping domain
];

// Build role → family index lookup
const ROLE_FAMILY_MAP = new Map<string, number>();
for (let i = 0; i < ROLE_FAMILIES.length; i++) {
  for (const role of ROLE_FAMILIES[i]) {
    ROLE_FAMILY_MAP.set(role.toLowerCase(), i);
  }
}

function computeTitleAlignment(
  jobTitle: string,
  targetTitles: string[],
  aiJobTitles: string[]
): number {
  const jt = jobTitle.toLowerCase().trim();
  const jtStripped = stripSeniority(jt);
  const allCandidateTitles = [...targetTitles, ...aiJobTitles].map((t) => t.toLowerCase().trim());

  // 1. Exact match (after seniority strip on both sides)
  for (const ct of allCandidateTitles) {
    const ctStripped = stripSeniority(ct);
    if (jtStripped === ctStripped || jt === ct.toLowerCase()) return 95;
    if (jtStripped.includes(ctStripped) || ctStripped.includes(jtStripped)) return 88;
  }

  // 2. Same role family
  const jtFamily = ROLE_FAMILY_MAP.get(jtStripped) ?? ROLE_FAMILY_MAP.get(jt);
  if (jtFamily !== undefined) {
    for (const ct of allCandidateTitles) {
      const ctFamily = ROLE_FAMILY_MAP.get(stripSeniority(ct)) ?? ROLE_FAMILY_MAP.get(ct);
      if (ctFamily === jtFamily) return 80;
    }
  }

  // 3. Significant word overlap (shared meaningful words)
  const jWords = new Set(jtStripped.split(/\s+/).filter((w) => w.length > 4));
  for (const ct of allCandidateTitles) {
    const ctWords = stripSeniority(ct).split(/\s+/).filter((w) => w.length > 4);
    const shared = ctWords.filter((w) => jWords.has(w));
    if (shared.length >= 2) return 70;
    if (shared.length === 1 && ctWords.length <= 3) return 55;
  }

  // 4. At least one key word matches
  for (const ct of allCandidateTitles) {
    const firstWord = ct.split(/\s+/)[0];
    if (firstWord && firstWord.length > 4 && jt.includes(firstWord)) return 45;
  }

  return 20;
}

// ─── Main match computation ───────────────────────────────────────────────────

export interface MatchResult {
  score: number;
  titleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  requiredCoverage: number;    // % of required skills the candidate has
  preferredCoverage: number;   // % of preferred skills the candidate has
  matchedKeywords: string[];
  missingKeywords: string[];
  details: string;
}

export function computeMatchScore(
  job: { title: string; description: string },
  profile: {
    resumeSkills: Set<string>;   // normalized lowercase skills from resume
    aiKeywords: string[];        // AI-extracted keywords (higher quality)
    aiJobTitles: string[];       // AI-determined suitable job titles
    targetTitles: string[];      // user's stated preferences
    experienceLevel: string;
    domain?: string;
  }
): MatchResult {
  const jobDesc = job.description ?? "";

  // Build a combined resume skill set: raw keywords + AI keywords
  const resumeSkills = new Set(profile.resumeSkills);
  for (const kw of profile.aiKeywords) {
    resumeSkills.add(kw.toLowerCase().trim());
  }

  // ── Extract job requirements ──
  const { required, preferred } = extractJobRequirements(job.title + "\n" + jobDesc);

  // ── Score required skills (40% of total) ──
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];

  for (const skill of required) {
    if (skillExistsInSet(skill, resumeSkills)) {
      matchedRequired.push(skill);
    } else {
      missingRequired.push(skill);
    }
  }

  const requiredCoverage = required.length > 0
    ? Math.round((matchedRequired.length / required.length) * 100)
    : 60; // no required section found → neutral

  // ── Score preferred skills (part of 15% bonus) ──
  const matchedPreferred: string[] = [];
  for (const skill of preferred) {
    if (skillExistsInSet(skill, resumeSkills)) matchedPreferred.push(skill);
  }
  const preferredCoverage = preferred.length > 0
    ? Math.round((matchedPreferred.length / preferred.length) * 100)
    : 50;

  // ── Title alignment (30%) ──
  const titleMatch = computeTitleAlignment(
    job.title,
    profile.targetTitles,
    profile.aiJobTitles
  );

  // ── Experience fit (15%) ──
  const experienceMatch = computeExperienceFit(
    profile.experienceLevel,
    jobDesc,
    job.title
  );

  // ── Domain alignment bonus (part of 15%) ──
  let domainBonus = 0;
  if (profile.domain && profile.domain !== "general") {
    const combinedLower = (job.title + " " + jobDesc).toLowerCase();
    // Simple domain signal check — does the job text contain signals for the user's domain?
    const domainSignals: Record<string, string[]> = {
      "backend software engineering": ["backend","api","microservice","server","database","node","python","java","django","flask"],
      "machine learning": ["machine learning","deep learning","model","neural","training","inference","dataset","tensorflow","pytorch"],
      "data science": ["data scientist","analysis","statistics","tableau","power bi","pandas","r studio","insights"],
      "data engineering": ["data engineer","pipeline","etl","airflow","spark","kafka","warehouse"],
      "devops": ["devops","kubernetes","terraform","docker","ci/cd","infrastructure","cloud","deployment"],
      "frontend": ["frontend","react","vue","angular","css","html","ui","web","browser"],
      "nursing": ["nurse","nursing","patient","clinical","bls","acls","icu","ehr","bedside"],
      "finance": ["financial","analyst","modeling","valuation","gaap","cfa","investment","equity"],
      "digital marketing": ["seo","ppc","google analytics","social media","content","campaign"],
      "supply chain": ["supply chain","logistics","procurement","inventory","warehouse"],
    };
    const signals = domainSignals[profile.domain] ?? [];
    const matchedSignals = signals.filter((s) => combinedLower.includes(s));
    domainBonus = Math.round((matchedSignals.length / Math.max(signals.length, 1)) * 20);
  }

  // ── Weighted final score ──
  // Required skills: 40%, Title: 30%, Experience: 15%, Preferred + domain: 15%
  const preferredBonus = Math.round(preferredCoverage * 0.10);
  const raw =
    requiredCoverage * 0.40 +
    titleMatch        * 0.30 +
    experienceMatch   * 0.15 +
    preferredBonus         +
    domainBonus;

  const score = Math.min(97, Math.max(18, Math.round(raw)));

  // ── Summary details ──
  const details = buildDetails(titleMatch, requiredCoverage, experienceMatch, missingRequired);

  return {
    score,
    titleMatch,
    skillsMatch: requiredCoverage,
    experienceMatch,
    requiredCoverage,
    preferredCoverage,
    matchedKeywords: [...matchedRequired, ...matchedPreferred].slice(0, 20),
    missingKeywords: missingRequired.slice(0, 15),
    details,
  };
}

function buildDetails(
  titleMatch: number,
  requiredCoverage: number,
  experienceMatch: number,
  missing: string[]
): string {
  const parts: string[] = [];

  if (titleMatch >= 85)       parts.push("Strong title alignment.");
  else if (titleMatch >= 60)  parts.push("Related role — good alignment.");
  else if (titleMatch >= 40)  parts.push("Adjacent role — some overlap.");
  else                        parts.push("Different role — consider tailoring.");

  if (requiredCoverage >= 80)      parts.push(`Excellent skills match — you meet ${requiredCoverage}% of required skills.`);
  else if (requiredCoverage >= 55) parts.push(`Solid skills match — you meet ${requiredCoverage}% of required skills.${missing.length ? ` Consider adding: ${missing.slice(0, 2).join(", ")}.` : ""}`);
  else                             parts.push(`Skills gap — you meet ${requiredCoverage}% of required skills. Key missing: ${missing.slice(0, 3).join(", ")}.`);

  if (experienceMatch >= 80)      parts.push("Experience level is a great fit.");
  else if (experienceMatch < 40)  parts.push("Experience level mismatch — this role may prefer more experience.");

  return parts.join(" ");
}
