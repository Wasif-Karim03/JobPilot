/**
 * Resume Analyzer — universal, domain-agnostic.
 * Works for ANY profession: tech, healthcare, marketing, finance, law, design, etc.
 *
 * Strategy:
 * 1. Try Gemini AI (runs once per resume save) — deep semantic understanding
 * 2. Section-aware algorithmic fallback — properly handles skills sections,
 *    single-letter languages (R, C, Go), structured lists, bullets
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumeAnalysis {
  domain: string;              // Primary professional domain
  keywords: string[];          // 50-70 ATS-searchable terms
  skills: string[];            // All confirmed skills (technical + domain-specific)
  softSkills: string[];        // Leadership, communication, etc.
  jobTitles: string[];         // Exact job-board-searchable titles
  experienceLevel: "intern" | "entry" | "mid" | "senior" | "executive";
  industries: string[];
  yearsOfExperience: number;
  analyzedAt: string;
}

// ─── Known short tokens that must NEVER be filtered by length ─────────────────
// These are real skills/languages/certifications that happen to be 1-3 chars.
// Sourced from real resume formats across 20+ professional domains.
const SHORT_SKILL_WHITELIST = new Set([
  // ── Programming languages (single/double letter) ──
  "r", "c", "go", "c#", "f#", "vb", "js", "ts", "py", "rb",
  // ── Web & data ──
  "sql", "css", "php", "xml", "ios", "jvm", "api", "sdk", "ide",
  "orm", "cdn", "vpc", "iam", "s3",
  // ── AI / Data science ──
  "ml", "ai", "cv", "nlp", "bi", "etl",
  // ── Design ──
  "ux", "ui",
  // ── Quality / Testing ──
  "qa", "qc", "tdd", "bdd", "e2e",
  // ── Business / Enterprise systems ──
  "erp", "crm", "sap", "bi",
  // ── Digital Marketing ──
  "seo", "sem", "cro", "ppc",           // search / paid media
  "ctr", "cpm", "cpc",                  // ad metrics
  "cac", "ltv",                         // growth metrics
  "ab",                                 // A/B testing
  "pr",                                 // public relations
  // ── Business metrics ──
  "roi", "kpi", "okr", "mrr", "arr",
  // ── Departments / Functions ──
  "hr", "it", "rd",
  // ── Healthcare clinical ──
  "rn", "lpn", "np", "pa", "crna",     // nursing/advanced practice roles
  "cna",                                // certified nursing assistant
  "bls", "acls", "pals", "tncc",       // certifications
  "icu", "er", "or", "ed", "ob",       // unit abbreviations
  "ems", "emt", "adn", "bsn", "msn",  // degrees/levels
  "ehr", "emr", "ekg", "ecg", "iv",   // clinical tools/skills
  "gi",                                 // gastroenterology
  // ── Finance / Investment ──
  "cfa", "cpa", "cma",                 // certifications
  "dcf", "lbo", "npv", "irr",         // valuation methods
  "eps", "fpa", "esg",                 // financial concepts
  "pe", "vc",                          // private equity / venture capital
  "etf", "nav", "aum",                 // asset management
  "pnl", "ebitda",                     // income metrics
  "roe", "roa",                        // return metrics
  // ── Legal ──
  "jd", "llm", "ip",                  // degrees / practice areas
  // ── Engineering (non-software) ──
  "cad", "fea", "bim",                // design/simulation tools
  "pcb", "plc",                        // electronics/automation
  "cnc", "spc",                        // manufacturing
  "gdt",                               // GD&T
  // ── Project / Program Management ──
  "pmp", "pmo",
  // ── Science / Research ──
  "pcr", "nmr", "ms",                 // lab methods (mass spec)
  // ── Miscellaneous abbreviations found in resume skills sections ──
  "3d", "2d", "ar", "vr", "xr",
]);

// ─── Domain detection ─────────────────────────────────────────────────────────

function detectDomain(text: string, skills: string[]): string {
  const combined = (text + " " + skills.join(" ")).toLowerCase();

  // ── Highly specific / niche tech domains first (prevent false-falls into generic "software") ──
  if (/\b(ros2?|robotics|lidar|slam|autonomous vehicle|embedded system|pixhawk|ardupilot|real-time os|rtos|motor control|servo|actuator|motion planning)\b/.test(combined)) return "robotics";
  if (/\b(machine learning|deep learning|tensorflow|pytorch|scikit.learn|llm|large language model|reinforcement learning|neural network|transformer model|fine.?tuning|hugging.?face|xgboost|lightgbm)\b/.test(combined)) return "machine learning";
  if (/\b(data engineer|etl pipeline|apache airflow|apache spark|dbt|data warehouse|kafka|flink|snowflake|databricks|redshift|bigquery|data lake|medallion|delta lake|dagster)\b/.test(combined)) return "data engineering";
  if (/\b(data scientist?|statistics|regression|hypothesis test|tableau|power bi|r studio|rstudio|pandas|numpy|matplotlib|seaborn|stata|spss|a\/b test)\b/.test(combined)) return "data science";
  if (/\b(devops|kubernetes|terraform|ansible|helm|platform engineer|site reliability|sre|cloud infrastructure|ci\/cd|jenkins|github actions|gitops|argocd|prometheus|grafana)\b/.test(combined)) return "devops";
  if (/\b(android|react native|flutter|swiftui|mobile develop|ios develop|kotlin|objective-c|xcode|android studio|expo|capacitor)\b/.test(combined)) return "mobile development";
  if (/\b(cybersecurity|penetration test|ethical hack|soc analyst|cissp|ceh|vulnerability|infosec|threat intel|siem|splunk|wireshark|metasploit|owasp|zero.?trust|incident response)\b/.test(combined)) return "cybersecurity";
  if (/\b(frontend|front-end|react\.?js|vue\.?js|angular|svelte|next\.?js|html5|ui develop|web develop|tailwind|webpack|vite|typescript)\b/.test(combined) && !/\bbackend\b/.test(combined)) return "frontend";
  if (/\b(full.?stack|fullstack)\b/.test(combined)) return "full stack engineering";
  if (/\b(backend|back-end|microservice|api develop|rest api|graphql|server.?side|flask|fastapi|django|spring boot|express\.?js|node\.?js|postgres|postgresql|mongodb|redis|rabbitmq|grpc)\b/.test(combined)) return "backend software engineering";
  if (/\b(software engineer|software develop|computer science|programming|coding|git|object.?oriented)\b/.test(combined)) return "software engineering";

  // ── Biomedical / Wet lab science ──
  if (/\b(elisa|western blot|pcr|cell culture|flow cytometry|crispr|gel electrophoresis|microscopy|tissue culture|sequencing|mass spectrometry|nmr|hplc|chromatography|centrifugation|assay|clinical trial|irb|fda|gmp|gcp|glp)\b/.test(combined)) return "biomedical research";

  // ── Mechanical / Civil / Electrical engineering ──
  if (/\b(solidworks|autocad|catia|ansys|abaqus|fea|finite element|cad design|gd&t|drafting|mechanical design|hvac|structural analysis|fluid dynamics|thermodynamics|tolerance|bom|dfm|plc|scada|pid control|circuit design|pcb design|altium|eagle|vhdl|verilog|fpga|embedded c)\b/.test(combined)) return "engineering";

  // ── Digital Marketing ──
  if (/\b(seo|google analytics|google ads|hubspot|content marketing|social media marketing|paid ads|facebook ads|influencer|affiliate marketing|sem|ppc|display advertising|retargeting|email marketing|mailchimp|klaviyo|marketo|pardot|a\/b test|conversion rate|funnel|landing page|shopify|woocommerce)\b/.test(combined)) return "digital marketing";

  // ── Marketing (brand/strategy) ──
  if (/\b(marketing manager|brand manager|campaign manager|market research|growth hacker|marketing coordinator|brand strategy|consumer insight|competitive analysis|go-to-market|integrated marketing|creative brief|media planning|media buying)\b/.test(combined)) return "marketing";

  // ── Finance / Investment Banking ──
  if (/\b(financial analyst|investment banking|equity research|financial model|financial modeling|gaap|ifrs|cfa|balance sheet|income statement|cash flow|valuation|dcf|lbo|m&a|capital markets|bloomberg|factset|pitchbook|excel model|vba|macro|ipo|debt financing|credit analysis|fixed income|derivatives)\b/.test(combined)) return "finance";

  // ── Accounting ──
  if (/\b(accounting|bookkeeping|accounts payable|accounts receivable|tax|tax preparation|tax return|audit|general ledger|journal entry|quickbooks|xero|sage|netsuite|reconciliation|financial statement|cpa exam|sox compliance|gaap|accrual)\b/.test(combined)) return "accounting";

  // ── Product Management ──
  if (/\b(product manager|product owner|product roadmap|user stories|backlog|okr|go-to-market|product strategy|feature prioritization|customer discovery|product led|prд|prd|product requirements|roadmap|sprint planning|stakeholder alignment)\b/.test(combined)) return "product management";

  // ── Project Management ──
  if (/\b(project manager|pmp|agile coach|scrum master|program manager|stakeholder management|project coordination|risk management|change management|resource allocation|project schedule|waterfall|kanban|prince2|ms project|smartsheet)\b/.test(combined)) return "project management";

  // ── Sales / Business Development ──
  if (/\b(salesforce|account executive|business development|cold calling|pipeline|quota|b2b sales|saas sales|revenue target|prospecting|crm|outreach|salesloft|hubspot sales|deal closing|enterprise sales|channel sales|partner sales|sdr|bdr|ae)\b/.test(combined)) return "sales";

  // ── UX / Product Design ──
  if (/\b(ux|user experience|user research|wireframe|figma|sketch|usability test|information architect|interaction design|design system|prototype|adobe xd|invision|design thinking|heuristic|persona|journey map|card sort|accessibility audit)\b/.test(combined)) return "ux design";

  // ── Graphic / Visual Design ──
  if (/\b(graphic design|illustrator|photoshop|indesign|brand identity|visual design|motion graphic|typography|after effects|premiere|canva|vector|print design|packaging design|logo design|creative direction)\b/.test(combined)) return "graphic design";

  // ── Supply Chain / Logistics / Operations ──
  if (/\b(supply chain|logistics|procurement|inventory|warehouse|vendor management|demand planning|s&op|lean manufacturing|six sigma|3pl|freight|customs|import|export|purchase order|rfq|rfp|sap mm|oracle scm|ascp|wms|tms)\b/.test(combined)) return "supply chain";

  // ── Human Resources ──
  if (/\b(human resources|hr manager|talent acquisition|recruiting|employee relations|onboarding|hris|compensation|benefits|payroll|workforce planning|performance management|learning and development|dei|culture|succession planning|workday|bamboohr|adp|greenhouse ats|lever ats)\b/.test(combined)) return "human resources";

  // ── Nursing ──
  if (/\b(nurse|nursing|registered nurse|rn|lpn|cna|patient care|medication administration|clinical|icu|er|ed|bls|acls|pals|medical surgical|telemetry|charge nurse|float nurse|per diem|staffing ratio|epic charting|cerner|pyxis|wound care|iv therapy|patient assessment)\b/.test(combined)) return "nursing";

  // ── Medicine / Physicians ──
  if (/\b(physician|doctor|m\.d\.|diagnosis|treatment plan|ehr|epic|clinical decision|hospital medicine|hospitalist|residency|fellowship|board certified|patient outcomes|icd-10|cpt code|prior authorization|clinical protocol|grand rounds)\b/.test(combined)) return "medicine";

  // ── Pharmacy ──
  if (/\b(pharmacist|pharmacy technician|drug utilization|compound|prescription|formulary|medication therapy|mtm|clinical pharmacy|pharmacy benefit|pbm|drug interaction|pharmacokinetics|medication reconciliation)\b/.test(combined)) return "pharmacy";

  // ── Law / Legal ──
  if (/\b(attorney|lawyer|litigation|contract law|legal research|compliance|paralegal|counsel|juris|westlaw|lexisnexis|legal brief|deposition|discovery|motion|brief|memorandum|corporate law|intellectual property|immigration law|family law|criminal defense|due diligence)\b/.test(combined)) return "law";

  // ── Education / Teaching ──
  if (/\b(teacher|educator|curriculum|lesson plan|classroom|pedagogy|k-12|instructional design|e-learning|lms|canvas|blackboard|differentiated instruction|special education|iep|stem education|higher education|tutoring|assessment|rubric|standards-based)\b/.test(combined)) return "education";

  // ── Academic / Basic Research (non-biomedical) ──
  if (/\b(research scientist?|phd|dissertation|laboratory|academic research|publication|scholarly|postdoc|principal investigator|grant writing|irb|peer.?review|conference paper|journal article|matlab|r programming|statistical analysis)\b/.test(combined)) return "research";

  // ── Hospitality / Tourism ──
  if (/\b(hotel|hospitality|front desk|revpar|adr|pms|opera|property management|food and beverage|f&b|event planning|catering|banquet|concierge|housekeeping|revenue management|occ|channel manager|booking.com|expedia partner)\b/.test(combined)) return "hospitality";

  // ── Real Estate ──
  if (/\b(real estate|property management|mls|listing agent|buyer agent|title|escrow|commercial real estate|cap rate|noi|lease negotiation|tenant relations|yardi|appfolio|argus|cre|reit)\b/.test(combined)) return "real estate";

  // ── Social Work / Counseling ──
  if (/\b(social work|case management|mental health|counseling|therapy|lcsw|lpc|mft|crisis intervention|substance abuse|community outreach|nonprofit|grant writing|client assessment|treatment planning|dss|dcfs)\b/.test(combined)) return "social work";

  return "general";
}

// ─── Domain → Search Titles mapping (universal) ───────────────────────────────

const DOMAIN_TITLES: Record<string, string[]> = {
  // ── Technology ──
  "robotics": [
    "Robotics Software Engineer", "Robotics Engineer", "Embedded Systems Engineer",
    "Autonomy Engineer", "Controls Engineer", "ROS Developer",
    "Autonomous Systems Engineer", "Motion Planning Engineer",
  ],
  "machine learning": [
    "Machine Learning Engineer", "ML Engineer", "AI Engineer",
    "Deep Learning Engineer", "NLP Engineer", "Computer Vision Engineer",
    "Applied ML Engineer", "AI Research Scientist", "MLOps Engineer",
  ],
  "data engineering": [
    "Data Engineer", "Senior Data Engineer", "ETL Developer",
    "Data Pipeline Engineer", "Analytics Engineer", "Big Data Engineer",
    "Data Platform Engineer", "Cloud Data Engineer",
  ],
  "data science": [
    "Data Scientist", "Data Analyst", "Business Analyst",
    "ML Researcher", "Applied Scientist", "Quantitative Analyst",
    "Business Intelligence Analyst", "Analytics Manager",
  ],
  "devops": [
    "DevOps Engineer", "Platform Engineer", "Site Reliability Engineer",
    "Cloud Engineer", "Infrastructure Engineer", "DevSecOps Engineer",
    "Cloud Infrastructure Engineer", "Kubernetes Engineer",
  ],
  "frontend": [
    "Frontend Engineer", "Frontend Developer", "React Developer",
    "UI Engineer", "Web Developer", "JavaScript Developer",
    "TypeScript Developer", "UI/UX Developer",
  ],
  "mobile development": [
    "Mobile Developer", "iOS Developer", "Android Developer",
    "React Native Developer", "Flutter Developer",
    "Mobile Software Engineer", "iOS Software Engineer",
  ],
  "cybersecurity": [
    "Security Engineer", "Cybersecurity Analyst", "SOC Analyst",
    "Penetration Tester", "Information Security Analyst",
    "Security Operations Analyst", "Threat Intelligence Analyst",
    "Application Security Engineer",
  ],
  "full stack engineering": [
    "Full Stack Engineer", "Full Stack Developer", "Software Engineer",
    "Web Application Developer", "Full Stack Software Engineer",
  ],
  "backend software engineering": [
    "Backend Software Engineer", "Backend Engineer", "Backend Developer",
    "Software Engineer", "API Engineer", "Python Developer",
    "Node.js Developer", "Java Developer", "Go Developer",
  ],
  "software engineering": [
    "Software Engineer", "Software Developer", "Application Developer",
    "Systems Engineer", "Junior Software Engineer", "Associate Software Engineer",
  ],
  "engineering": [
    "Mechanical Engineer", "Electrical Engineer", "Civil Engineer",
    "Structural Engineer", "Controls Engineer", "Manufacturing Engineer",
    "Process Engineer", "Systems Engineer", "Hardware Engineer",
    "Firmware Engineer", "PCB Design Engineer", "Embedded Systems Engineer",
  ],
  "biomedical research": [
    "Research Scientist", "Senior Research Scientist", "Research Associate",
    "Postdoctoral Researcher", "Lab Scientist", "Biomedical Scientist",
    "Clinical Research Associate", "Scientist II", "Research Biologist",
  ],
  // ── Marketing ──
  "digital marketing": [
    "Digital Marketing Specialist", "SEO Specialist", "SEM Specialist",
    "Content Marketing Manager", "Performance Marketing Manager",
    "Growth Marketer", "Marketing Analyst", "Paid Media Specialist",
    "Digital Marketing Manager", "Social Media Manager",
  ],
  "marketing": [
    "Marketing Specialist", "Marketing Coordinator", "Marketing Manager",
    "Brand Manager", "Campaign Manager", "Marketing Associate",
    "Marketing Communications Manager", "Product Marketing Manager",
  ],
  // ── Finance / Accounting ──
  "finance": [
    "Financial Analyst", "Investment Analyst", "FP&A Analyst",
    "Finance Associate", "Equity Research Analyst", "Quantitative Analyst",
    "Corporate Finance Analyst", "Investment Banking Analyst",
    "Portfolio Analyst", "Financial Planning Analyst",
  ],
  "accounting": [
    "Staff Accountant", "Accountant", "Accounting Analyst",
    "Audit Associate", "Tax Analyst", "Senior Accountant",
    "Junior Accountant", "Tax Associate", "CPA Candidate",
    "Accounts Payable Specialist",
  ],
  // ── Business / Strategy ──
  "product management": [
    "Product Manager", "Associate Product Manager", "Junior Product Manager",
    "Product Owner", "Product Analyst", "Technical Product Manager",
    "Growth Product Manager", "Product Operations Manager",
  ],
  "project management": [
    "Project Manager", "Program Manager", "Project Coordinator",
    "Scrum Master", "Agile Coach", "IT Project Manager",
    "Technical Program Manager", "PMO Analyst",
  ],
  "sales": [
    "Sales Development Representative", "Account Executive",
    "Business Development Representative", "Account Manager",
    "Sales Engineer", "Inside Sales Representative",
    "Enterprise Account Executive", "Business Development Manager",
  ],
  // ── Design ──
  "ux design": [
    "UX Designer", "Product Designer", "UI/UX Designer",
    "UX Researcher", "Interaction Designer", "User Experience Designer",
    "UX/UI Designer", "Senior UX Designer", "Service Designer",
  ],
  "graphic design": [
    "Graphic Designer", "Visual Designer", "Brand Designer",
    "Creative Designer", "Motion Designer", "Art Director",
    "Junior Graphic Designer", "Marketing Designer",
  ],
  // ── Operations / Supply Chain ──
  "supply chain": [
    "Supply Chain Analyst", "Logistics Coordinator", "Operations Analyst",
    "Procurement Analyst", "Inventory Analyst", "Supply Chain Manager",
    "Demand Planner", "Logistics Manager", "Procurement Specialist",
  ],
  // ── HR / People ──
  "human resources": [
    "HR Coordinator", "Talent Acquisition Specialist", "Recruiter",
    "HR Generalist", "People Operations Specialist",
    "Technical Recruiter", "Talent Acquisition Partner",
    "HR Business Partner", "Compensation Analyst",
  ],
  // ── Healthcare ──
  "nursing": [
    "Registered Nurse", "Staff Nurse", "Clinical Nurse",
    "ICU Nurse", "ER Nurse", "Travel Nurse",
    "Med-Surg Nurse", "Telemetry Nurse", "Float Pool RN",
    "Labor and Delivery Nurse", "Pediatric Nurse",
  ],
  "medicine": [
    "Physician", "Medical Officer", "Hospitalist",
    "Resident Physician", "Attending Physician", "Internal Medicine Physician",
  ],
  "pharmacy": [
    "Pharmacist", "Clinical Pharmacist", "Pharmacy Technician",
    "Retail Pharmacist", "Hospital Pharmacist",
  ],
  // ── Legal ──
  "law": [
    "Associate Attorney", "Legal Analyst", "Paralegal",
    "Legal Counsel", "Contract Specialist", "Contracts Manager",
    "Corporate Attorney", "Litigation Associate", "Legal Associate",
    "Contract Administrator",
  ],
  // ── Education ──
  "education": [
    "Teacher", "Educator", "Instructional Designer",
    "Curriculum Developer", "Academic Coordinator",
    "K-12 Teacher", "High School Teacher", "Middle School Teacher",
    "Adjunct Professor", "Academic Advisor",
  ],
  // ── Research ──
  "research": [
    "Research Scientist", "Research Associate", "Research Analyst",
    "Research Engineer", "Research Fellow", "Postdoctoral Associate",
    "Senior Research Scientist", "Clinical Research Coordinator",
  ],
  // ── Other domains ──
  "hospitality": [
    "Hotel Manager", "Front Desk Agent", "Front Office Manager",
    "Revenue Manager", "Guest Services Manager",
    "Food and Beverage Manager", "Event Coordinator",
  ],
  "real estate": [
    "Real Estate Analyst", "Asset Manager", "Property Manager",
    "Leasing Agent", "Real Estate Associate",
    "Commercial Real Estate Analyst", "Investment Analyst",
  ],
  "social work": [
    "Social Worker", "Case Manager", "Mental Health Counselor",
    "Licensed Clinical Social Worker", "School Social Worker",
    "Community Outreach Coordinator",
  ],
  "general": [
    "Analyst", "Coordinator", "Specialist", "Associate", "Consultant",
  ],
};

// ─── Build final search titles (resume AI + user preference) ─────────────────

export function buildSearchTitles(
  prefs: { targetTitles: string[]; experienceLevel?: string },
  analysis: ResumeAnalysis | null
): string[] {
  const titles = new Set<string>();

  // 1. AI-extracted job titles from the resume (most accurate)
  for (const t of analysis?.jobTitles ?? []) {
    if (t && t.length > 3) titles.add(t);
  }

  // 2. Normalize user preferences and add
  for (const raw of prefs.targetTitles) {
    const norm = normalizePreferenceTitle(raw);
    if (norm) titles.add(norm);
  }

  // 3. If still not enough titles, use domain-based fallback
  if (titles.size < 4) {
    const domain = analysis?.domain ?? detectDomain("", []);
    const domainTitles = DOMAIN_TITLES[domain] ?? DOMAIN_TITLES["general"]!;
    for (const t of domainTitles.slice(0, 5)) titles.add(t);
  }

  // Filter and limit
  return Array.from(titles).filter((t) => t.length > 3).slice(0, 12);
}

function normalizePreferenceTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // "Software Engineering" → "Software Engineer" (common user mistake)
  if (/engineering$/i.test(trimmed) && !trimmed.toLowerCase().includes("machine")) {
    return trimmed.replace(/engineering$/i, "Engineer");
  }
  // "Software Developing" → "Software Developer"
  if (/developing$/i.test(trimmed)) return trimmed.replace(/developing$/i, "Developer");
  // "Marketing" alone → "Marketing Specialist" (too vague otherwise)
  if (/^marketing$/i.test(trimmed)) return "Marketing Specialist";
  if (/^nursing$/i.test(trimmed)) return "Registered Nurse";
  if (/^accounting$/i.test(trimmed)) return "Accountant";
  if (/^finance$/i.test(trimmed)) return "Financial Analyst";
  if (/^design$/i.test(trimmed)) return "Designer";
  if (/^sales$/i.test(trimmed)) return "Sales Representative";
  return trimmed;
}

// ─── Section-aware algorithmic extractor ──────────────────────────────────────

// Detects section boundaries in plain text resumes
const SECTION_HEADERS = /^(technical\s+skills?|skills?|core\s+competencies?|expertise|qualifications?|work\s+experience|professional\s+experience|experience|employment|projects?|education|academic|certifications?|licenses?|summary|objective|profile|about|publications?|research|awards?|achievements?|volunteer|leadership|activities?)[\s:]*$/im;

function parseResumeIntoSections(text: string): Record<string, string> {
  const sections: Record<string, string> = { _full: text };
  const lines = text.split("\n");
  let currentSection = "header";
  let buffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (SECTION_HEADERS.test(trimmed) && trimmed.length < 60) {
      // Save previous section
      if (buffer.length) sections[currentSection] = buffer.join("\n");
      currentSection = trimmed.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "");
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length) sections[currentSection] = buffer.join("\n");
  return sections;
}

// Extract skills from a skills section — preserves short items like R, C, Go
function extractSkillSectionItems(text: string): string[] {
  const items: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // "Category: item1, item2, item3" — skills listed after a colon
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      const rest = trimmed.slice(colonIdx + 1).trim();
      if (rest.includes(",") || rest.includes("·") || rest.includes("|")) {
        const split = rest.split(/[,;·|]/).map((s) => s.trim()).filter((s) => {
          if (!s) return false;
          const l = s.toLowerCase();
          // Allow short known skills; otherwise require length >= 2
          return SHORT_SKILL_WHITELIST.has(l) || s.length >= 2;
        });
        items.push(...split);
        continue;
      }
    }

    // Bullet / dash format: "• Python • React • Node.js"
    if (/^[-•*◆▪·]/.test(trimmed)) {
      // Could be a list on one line or a single item
      const withoutBullet = trimmed.replace(/^[-•*◆▪·]\s*/, "");
      const split = withoutBullet.split(/[,;·|•]/).map((s) => s.trim()).filter(Boolean);
      if (split.length > 1) {
        items.push(...split.filter((s) => SHORT_SKILL_WHITELIST.has(s.toLowerCase()) || s.length >= 2));
      } else {
        items.push(withoutBullet.trim());
      }
      continue;
    }

    // Comma-separated line (no bullet, no colon)
    if (trimmed.includes(",")) {
      const split = trimmed.split(",").map((s) => s.trim()).filter((s) => SHORT_SKILL_WHITELIST.has(s.toLowerCase()) || s.length >= 2);
      items.push(...split);
    }
  }

  return Array.from(new Set(items)).filter(Boolean);
}

// Extract technologies mentioned in experience/project bullets
function extractFromBullets(text: string): string[] {
  const results: string[] = [];

  // "using X, Y and Z" / "with X, Y" / "via X"
  const usingPattern = /(?:using|built with|developed with|implemented with|with|via|in)\s+([A-Za-z][A-Za-z0-9\s\-+#./]{1,50}?)(?=[\s,;)\n]|and\s|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = usingPattern.exec(text)) !== null) {
    const term = m[1].trim();
    if (term.length >= 2 && term.length < 40) results.push(term);
  }

  // Technologies inside parentheses: "(React, Node.js, PostgreSQL)"
  const parenPattern = /\(([^)]{3,100})\)/g;
  while ((m = parenPattern.exec(text)) !== null) {
    const inner = m[1];
    if (inner.includes(",")) {
      const items = inner.split(",").map((s) => s.trim()).filter((s) => s.length >= 2 && s.length < 40);
      results.push(...items);
    }
  }

  return results;
}

// Extract ALL CAPS acronyms (AWS, REST, SQL, ROS2, etc.)
function extractAcronyms(text: string): string[] {
  const STOP = new Set(["THE","AND","FOR","WITH","YOU","ARE","WAS","HAS","HAVE","BEEN","WILL","CAN","OUR","YOUR","THIS","THAT","NOT","BUT","ALL","ANY","NEW","USE","MAY","INC","LLC","LTD"]);
  return Array.from(new Set(
    (text.match(/\b[A-Z][A-Z0-9+#]{1,10}\b/g) ?? []).filter((w) => !STOP.has(w))
  )).map((a) => a.toLowerCase());
}

function analyzeAlgorithmically(text: string, userPrefs: string[] = []): ResumeAnalysis {
  const sections = parseResumeIntoSections(text);

  // ── Extract from skills section ──
  const skillsSection = sections["technical_skills"] ?? sections["skills"] ?? sections["core_competencies"] ?? sections["expertise"] ?? "";
  const skillSectionItems = extractSkillSectionItems(skillsSection);

  // ── Extract from experience/projects ──
  const expSection = sections["work_experience"] ?? sections["professional_experience"] ?? sections["experience"] ?? "";
  const projSection = sections["projects"] ?? "";
  const bulletSkills = [
    ...extractFromBullets(expSection),
    ...extractFromBullets(projSection),
  ];

  // ── ALL CAPS acronyms from full text ──
  const acronyms = extractAcronyms(text);

  // ── Capitalized multi-word phrases (e.g., "Google Analytics", "Apache Airflow") ──
  const capitalizedPhrases = Array.from(new Set(
    (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+)+\b/g) ?? [])
      .filter((p) => !["Jan 20","Feb 20","Mar 20","Apr 20","May 20","Jun 20","Jul 20","Aug 20","Sep 20","Oct 20","Nov 20","Dec 20"].some((d) => p.startsWith(d)))
  )).map((p) => p.toLowerCase());

  // ── Soft skills signals ──
  const softSkillPatterns = /\b(leadership|communication|teamwork|collaboration|problem.solving|critical thinking|time management|adaptability|mentoring|mentorship|cross.functional|stakeholder|public speaking|presentation|detail.oriented|fast.paced|initiative|self.motivated|analytical|organizational)\b/gi;
  const softSkills = Array.from(new Set((text.match(softSkillPatterns) ?? []).map((s) => s.toLowerCase())));

  // ── Merge all skills ──
  const allSkillsRaw = [
    ...skillSectionItems,
    ...bulletSkills,
    ...capitalizedPhrases,
  ];
  const skills = Array.from(new Set(allSkillsRaw.map((s) => s.trim()).filter((s) => {
    if (!s) return false;
    const l = s.toLowerCase();
    return SHORT_SKILL_WHITELIST.has(l) || s.length >= 2;
  }))).slice(0, 80);

  // ── Keywords = skills + acronyms (all lowercased for matching) ──
  const keywordsRaw = [
    ...skills.map((s) => s.toLowerCase()),
    ...acronyms,
  ];
  const keywords = Array.from(new Set(keywordsRaw.filter((k) => {
    const l = k.toLowerCase();
    return SHORT_SKILL_WHITELIST.has(l) || k.length >= 2;
  }))).slice(0, 80);

  // ── Domain detection ──
  const domain = detectDomain(text, skills);

  // ── Experience level ──
  const lower = text.toLowerCase();
  const yearMatches = (text.match(/\b(20\d{2})\b/g) ?? []).map(Number);
  const span = yearMatches.length >= 2 ? Math.max(...yearMatches) - Math.min(...yearMatches) : 0;
  const years = Math.max(0, span - 4);
  let experienceLevel: ResumeAnalysis["experienceLevel"] = "entry";
  if (years >= 10) experienceLevel = "senior";
  else if (years >= 5) experienceLevel = "mid";
  else if (years >= 2) experienceLevel = "entry";
  else experienceLevel = lower.includes("intern") || lower.includes("student") ? "intern" : "entry";

  // ── Job title detection from resume text ──
  const titlePat = /^([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Designer|Scientist|Consultant|Specialist|Director|Lead|Architect|Intern|Coordinator|Researcher|Administrator|Nurse|Teacher|Lawyer|Accountant|Strategist|Advisor))\b/gm;
  const detectedTitles = Array.from(new Set((text.match(titlePat) ?? []).map((t) => t.trim())));

  // ── Final job titles: detected + domain + user prefs ──
  const domainTitles = DOMAIN_TITLES[domain] ?? DOMAIN_TITLES["general"]!;
  const jobTitles = Array.from(new Set([
    ...detectedTitles.filter((t) => t.length < 60).slice(0, 4),
    ...domainTitles.slice(0, 6),
    ...userPrefs.map(normalizePreferenceTitle).filter(Boolean),
  ])).slice(0, 10);

  // ── Industries from domain ──
  const industryMap: Record<string, string[]> = {
    "backend software engineering": ["software engineering", "cloud computing", "web services"],
    "frontend": ["software engineering", "web development", "digital products"],
    "full stack engineering": ["software engineering", "web development", "cloud computing"],
    "software engineering": ["software engineering", "technology", "information technology"],
    "machine learning": ["artificial intelligence", "machine learning", "data science"],
    "data engineering": ["data engineering", "big data", "analytics"],
    "data science": ["data science", "analytics", "business intelligence"],
    "devops": ["cloud infrastructure", "platform engineering", "devops"],
    "mobile development": ["mobile technology", "consumer apps", "software engineering"],
    "cybersecurity": ["cybersecurity", "information security", "risk management"],
    "robotics": ["robotics", "autonomous systems", "embedded systems", "aerospace"],
    "engineering": ["mechanical engineering", "electrical engineering", "manufacturing", "aerospace"],
    "biomedical research": ["biotechnology", "pharmaceuticals", "life sciences", "academic research"],
    "digital marketing": ["digital marketing", "e-commerce", "media", "advertising"],
    "marketing": ["marketing", "brand management", "advertising", "communications"],
    "finance": ["finance", "investment banking", "fintech", "asset management"],
    "accounting": ["accounting", "audit", "tax", "financial services"],
    "product management": ["software", "saas", "consumer products", "technology"],
    "project management": ["consulting", "technology", "operations", "construction"],
    "sales": ["saas", "b2b sales", "enterprise software", "technology"],
    "ux design": ["ux design", "product design", "digital products"],
    "graphic design": ["design", "advertising", "media", "branding"],
    "supply chain": ["supply chain", "logistics", "operations", "manufacturing"],
    "human resources": ["human resources", "staffing", "consulting", "corporate services"],
    "nursing": ["healthcare", "nursing", "clinical care", "hospital"],
    "medicine": ["healthcare", "clinical medicine", "hospital systems"],
    "pharmacy": ["pharmacy", "healthcare", "pharmaceuticals"],
    "law": ["legal", "compliance", "consulting", "corporate law"],
    "education": ["education", "k-12", "higher education", "edtech"],
    "research": ["academic research", "life sciences", "r&d"],
    "hospitality": ["hospitality", "tourism", "food and beverage", "hotels"],
    "real estate": ["real estate", "commercial real estate", "property management"],
    "social work": ["social services", "nonprofit", "healthcare", "mental health"],
  };
  const industries = industryMap[domain] ?? [domain];

  return {
    domain,
    keywords,
    skills,
    softSkills,
    jobTitles,
    experienceLevel,
    industries,
    yearsOfExperience: years,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Gemini-powered analysis ──────────────────────────────────────────────────

async function analyzeWithGemini(text: string, userPrefs: string[] = []): Promise<ResumeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No GEMINI_API_KEY");

  const prefsNote = userPrefs.length > 0
    ? `The candidate has stated they are looking for roles related to: ${userPrefs.join(", ")}.`
    : "The candidate has not specified a target role — infer from resume content.";

  const prompt = `You are a senior HR expert and ATS specialist with deep knowledge of resume formats across every profession. Analyze this resume carefully.

${prefsNote}

Resume text:
---
${text.slice(0, 9000)}
---

CRITICAL PARSING RULES:
1. In a SKILLS section, treat ALL listed items as confirmed skills — INCLUDING single-character languages and short abbreviations:
   "Languages: Python, C++, C, R, Go" → C is the C language, R is the R language, Go is the Go language
   "R" alone in a skills list = the R programming language (NOT the letter R)
   "C" in a skills list = the C programming language
   "SQL", "CSS", "PHP", "VBA", "SAS", "SPSS", "EHR" = real domain skills — do NOT filter these out

2. This analyzer is UNIVERSAL — it works for ANY profession. Domain-specific skill examples:
   - Software Engineering: languages (Python, Go, Rust), frameworks, cloud (AWS, GCP, Azure), databases, DevOps tools
   - Healthcare/Nursing: patient care, EHR systems (Epic, Cerner), certifications (RN, BLS, ACLS, PALS), specialties (ICU, ER, telemetry), procedures
   - Finance: financial modeling, GAAP, Bloomberg, DCF, LBO, Excel, VBA, CFA, CPA, equity research, valuation
   - Marketing: SEO, Google Analytics, HubSpot, Salesforce, content strategy, A/B testing, PPC, CTR, ROAS, campaign management
   - Design: Figma, Adobe XD, Sketch, Illustrator, Photoshop, typography, wireframing, design systems
   - Law: legal research, contract drafting, litigation, compliance, Westlaw, LexisNexis, IP law, due diligence
   - Mechanical/Electrical Engineering: CAD (SolidWorks, AutoCAD), FEA, PCB design, PLC programming, GD&T
   - Research/Science: ELISA, Western blot, PCR, cell culture, MATLAB, HPLC, mass spectrometry, grant writing
   - Supply Chain: SAP, Oracle SCM, demand planning, procurement, S&OP, 3PL, Lean, Six Sigma
   - HR: ATS (Greenhouse, Lever), HRIS (Workday, BambooHR), talent acquisition, compensation, DEI
   - Education: curriculum design, LMS (Canvas, Blackboard), differentiated instruction, IEP, standards-based grading
   - Hospitality: property management systems (Opera), RevPAR, ADR, F&B operations, event planning

3. DO NOT filter out short skills just because they are short. R, C, Go, SQL, BI, UX, UI, BLS, CFA, DCF, GD&T, PCB, PLC are ALL valid skills.
4. For job titles, consider BOTH the resume content AND the candidate's stated preference. Job titles must be ones that actually appear on job boards — be specific and searchable.

Return ONLY a valid JSON object (no markdown, no code fences, no explanation):
{
  "domain": "",
  "skills": [],
  "softSkills": [],
  "jobTitles": [],
  "experienceLevel": "entry",
  "industries": [],
  "keywords": [],
  "yearsOfExperience": 0
}

Field instructions:
- domain: One concise string describing the primary professional domain. Examples: "backend software engineering", "digital marketing", "nursing", "financial analysis", "UX design", "supply chain management", "mechanical engineering", "biomedical research"
- skills: Every confirmed skill from the resume — from skills sections AND experience bullets. Include: technical tools, languages, frameworks, certifications, domain-specific software, methodologies, systems. 40-80 items. Be exhaustive. Include things like "Epic EMR", "Westlaw", "SolidWorks", "Bloomberg Terminal", "Adobe Photoshop", "Salesforce CRM" — full product names.
- softSkills: Leadership, communication, teamwork, cross-functional collaboration, mentoring, public speaking, problem-solving, etc. found in the resume.
- jobTitles: 8-12 SPECIFIC, EXACT titles that appear on job boards for this person. Consider stated preference AND resume evidence. Examples: "Backend Software Engineer", "Python Developer", "Registered Nurse RN", "Financial Analyst", "Digital Marketing Specialist", "Staff Nurse ICU", "Equity Research Analyst", "UX Designer", "Mechanical Engineer". Vary seniority slightly.
- experienceLevel: "intern" (student/no full-time) / "entry" (<2 years full-time) / "mid" (2-5 years) / "senior" (5-10 years) / "executive" (10+ years or C-level).
- industries: 2-5 specific industries/sectors relevant to this person.
- keywords: 50-70 ATS search terms — exactly what a recruiter would type. For tech: exact package names (NumPy, Pandas, React.js). For business: specific software (Salesforce, HubSpot, Tableau). For healthcare: specific certifications and clinical skills. For finance: specific valuation methods, tools. All lowercase.
- yearsOfExperience: Total professional experience in years. Internships = 0.5 each. Full-time = face value.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonStr = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  return {
    domain: parsed.domain ?? "general",
    keywords: (parsed.keywords ?? []).map((k: string) => k.toLowerCase().trim()).filter(Boolean),
    skills: (parsed.skills ?? []).map((s: string) => s.trim()).filter(Boolean),
    softSkills: (parsed.softSkills ?? []).map((s: string) => s.trim()).filter(Boolean),
    jobTitles: (parsed.jobTitles ?? []).filter(Boolean),
    experienceLevel: parsed.experienceLevel ?? "entry",
    industries: (parsed.industries ?? []).filter(Boolean),
    yearsOfExperience: Number(parsed.yearsOfExperience) || 0,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeResume(text: string, userPrefs: string[] = []): Promise<ResumeAnalysis> {
  if (!text?.trim()) {
    return {
      domain: "general", keywords: [], skills: [], softSkills: [], jobTitles: [],
      experienceLevel: "entry", industries: [], yearsOfExperience: 0,
      analyzedAt: new Date().toISOString(),
    };
  }
  try {
    const result = await analyzeWithGemini(text, userPrefs);
    console.log(`[analyzer] Gemini: domain="${result.domain}", ${result.keywords.length} keywords, ${result.jobTitles.length} job titles`);
    return result;
  } catch (err) {
    console.warn("[analyzer] Gemini failed, using algorithmic fallback:", err instanceof Error ? err.message : err);
    const result = analyzeAlgorithmically(text, userPrefs);
    console.log(`[analyzer] Algorithmic: domain="${result.domain}", ${result.keywords.length} keywords`);
    return result;
  }
}

// ─── Job description keyword extraction ───────────────────────────────────────
// Used to extract what a specific job posting is looking for.
// Returns lowercased terms suitable for matching against resume keywords.

export function extractJobKeywords(jobText: string): string[] {
  if (!jobText) return [];

  // ALL CAPS acronyms
  const acronyms = Array.from(new Set(
    (jobText.match(/\b[A-Z][A-Z0-9+#]{1,10}\b/g) ?? [])
      .filter((w) => !["THE","AND","FOR","WITH","YOU","ARE","WAS","HAS","HAVE","BEEN","WILL","CAN","OUR","YOUR","THIS","THAT","NOT","BUT","ALL","ANY","NEW","USE","WE","OUR","YOU","OR"].includes(w))
  )).map((a) => a.toLowerCase());

  // Capitalized product/tool names (e.g., "Google Analytics", "Apache Kafka")
  const capitalizedTerms = Array.from(new Set(
    (jobText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+)+\b/g) ?? [])
  )).map((t) => t.toLowerCase());

  // Extract from requirements/qualifications sections
  const reqMatch = jobText.match(
    /(?:requirements?|qualifications?|you(?:'ll|\s+will)\s+(?:have|need|bring)|ideal candidate|skills required|must have|what we(?:'re)?\s+looking for|technical skills?|key skills?|what you.ll bring|what you bring)[:\s\n]+([^]*?)(?:\n\n|\n[A-Z][a-z]+:|\n[A-Z]{2,}|\n---|\n===|$)/gi
  );
  const reqText = (reqMatch ?? []).join(" ");

  // All bullet items
  const bullets = (jobText.match(/^[\s]*[-•*◆▪·]\s+(.+)$/gm) ?? [])
    .map((l) => l.replace(/^[\s]*[-•*◆▪·]\s+/, "").trim());

  const allText = [reqText, ...bullets].join(" ").toLowerCase();

  const stopWords = new Set(["the","and","or","in","at","for","to","of","a","an","with","on","is","was","are","were","be","been","have","has","had","you","we","our","their","this","that","will","can","must","should","would","able","work","team","join","help","build","use","also","both","some","more","most","very","well","just","even","back","new","way","may","see","than","then","its","him","his","her","them","they","who","what","when","where","why","how","please","etc","e.g","i.e","strong","excellent","good","great","plus","minimum","preferred","required","ability","experience","years","year","including","within","across","using","via","per","day","days","time","role","company","position","job","about","us","get","create","develop","design","make","need","want","like","know","understand","provide","ensure","support","manage","work","team","business","product","solutions"]);

  const words = allText
    .replace(/[^a-z0-9\s+#./]/g, " ")
    .split(/\s+/)
    .filter((w) => {
      if (!w) return false;
      const l = w.toLowerCase();
      return (SHORT_SKILL_WHITELIST.has(l) || w.length >= 3) && !stopWords.has(l) && !/^\d+$/.test(w);
    });

  return Array.from(new Set([...words, ...acronyms, ...capitalizedTerms])).filter(Boolean);
}
