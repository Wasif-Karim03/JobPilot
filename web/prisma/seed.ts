import {
  PrismaClient,
  UserRole,
  SearchDepth,
  JobStatus,
  SearchRunStatus,
  ResumeFormat,
  ContactRelationType,
  OutreachType,
  OutreachStatus,
} from "@prisma/client";
import nodeCrypto from "crypto";

const prisma = new PrismaClient();

// Uses same algorithm as Better Auth: scrypt with N=16384, r=16, p=1, dkLen=64
// Format: "hexSalt:hexKey"
async function hashPassword(password: string): Promise<string> {
  const salt = nodeCrypto.randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => {
    nodeCrypto.scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, derivedKey) => (err ? reject(err) : resolve(derivedKey))
    );
  });
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================================
  // ADMIN USER
  // ============================================================
  const adminEmail = process.env.ADMIN_EMAIL ?? "wasifkarim03@gmail.com";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin User",
      role: UserRole.ADMIN,
      onboardingComplete: true,
    },
  });
  // Store password in accounts table (Better Auth credential provider)
  await prisma.account.upsert({
    where: { id: `${admin.id}-credential` },
    update: { password: await hashPassword("AdminPass123") },
    create: {
      id: `${admin.id}-credential`,
      userId: admin.id,
      accountId: adminEmail,
      providerId: "credential",
      password: await hashPassword("AdminPass123"),
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ============================================================
  // REGULAR USERS
  // ============================================================
  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      role: UserRole.USER,
      onboardingComplete: true,
    },
  });
  await prisma.account.upsert({
    where: { id: `${user1.id}-credential` },
    update: { password: await hashPassword("Password123") },
    create: {
      id: `${user1.id}-credential`,
      userId: user1.id,
      accountId: "alice@example.com",
      providerId: "credential",
      password: await hashPassword("Password123"),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      role: UserRole.USER,
      onboardingComplete: true,
    },
  });
  await prisma.account.upsert({
    where: { id: `${user2.id}-credential` },
    update: { password: await hashPassword("Password123") },
    create: {
      id: `${user2.id}-credential`,
      userId: user2.id,
      accountId: "bob@example.com",
      providerId: "credential",
      password: await hashPassword("Password123"),
    },
  });
  console.log(`✅ Users: ${user1.email}, ${user2.email}`);

  // ============================================================
  // JOB PREFERENCES
  // ============================================================
  await prisma.jobPreferences.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      targetTitles: ["Software Engineer", "Backend Engineer", "Full Stack Engineer"],
      targetLocations: ["Columbus, OH", "Remote", "New York, NY"],
      remotePreference: "hybrid",
      salaryMin: 90000,
      salaryMax: 150000,
      companySizes: ["startup", "mid", "large"],
      industries: ["tech", "fintech", "saas"],
      experienceLevel: "entry",
      visaSponsorship: false,
      keywords: ["TypeScript", "Node.js", "React", "PostgreSQL"],
    },
  });

  await prisma.jobPreferences.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      targetTitles: ["Data Engineer", "Machine Learning Engineer", "Backend Developer"],
      targetLocations: ["San Francisco, CA", "Remote"],
      remotePreference: "remote",
      salaryMin: 100000,
      salaryMax: 180000,
      companySizes: ["mid", "large", "enterprise"],
      industries: ["tech", "robotics", "healthcare"],
      experienceLevel: "mid",
      visaSponsorship: false,
      keywords: ["Python", "Spark", "Kubernetes", "AWS"],
    },
  });

  // ============================================================
  // RESUMES (5 total: 1 master per user + extras)
  // ============================================================
  const resume1 = await prisma.resume.create({
    data: {
      userId: user1.id,
      title: "Master Resume — Software Engineer",
      isMaster: true,
      format: ResumeFormat.STRUCTURED,
      contactInfo: {
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "+1-614-555-0100",
        linkedin: "https://linkedin.com/in/alicejohnson",
        github: "https://github.com/alicejohnson",
        location: "Columbus, OH",
      },
      summary:
        "Full-stack software engineer with 2 years of experience building scalable web applications. Passionate about TypeScript, distributed systems, and developer tooling.",
      experience: [
        {
          company: "TechStartup Inc.",
          title: "Software Engineer",
          location: "Columbus, OH",
          startDate: "2023-06",
          endDate: null,
          bullets: [
            "Built REST APIs with Node.js + Express serving 50k daily users",
            "Migrated legacy PostgreSQL queries to Prisma ORM, reducing query errors by 80%",
            "Led migration from JavaScript to TypeScript across 3 microservices",
          ],
        },
        {
          company: "Web Agency Co.",
          title: "Junior Developer",
          location: "Columbus, OH",
          startDate: "2022-01",
          endDate: "2023-05",
          bullets: [
            "Developed client-facing dashboards using React and Tailwind CSS",
            "Maintained CI/CD pipelines using GitHub Actions",
          ],
        },
      ],
      education: [
        {
          school: "Ohio Wesleyan University",
          degree: "Bachelor of Science",
          field: "Computer Science",
          gpa: "3.7",
          startDate: "2018-09",
          endDate: "2022-05",
        },
      ],
      skills: {
        technical: ["TypeScript", "JavaScript", "Python", "SQL"],
        frameworks: ["React", "Next.js", "Node.js", "Express", "tRPC"],
        tools: ["Docker", "Git", "GitHub Actions", "AWS", "Prisma"],
        languages: ["English (native)"],
      },
      parsedContent:
        "Alice Johnson | Software Engineer | Columbus, OH | TypeScript, JavaScript, Python, React, Next.js, Node.js, PostgreSQL, Docker",
    },
  });

  const resume2 = await prisma.resume.create({
    data: {
      userId: user1.id,
      title: "Tailored — Backend Focus",
      isMaster: false,
      format: ResumeFormat.STRUCTURED,
      contactInfo: {
        name: "Alice Johnson",
        email: "alice@example.com",
        location: "Columbus, OH",
      },
      parsedContent:
        "Alice Johnson | Backend Engineer | Node.js, PostgreSQL, Redis, Docker, Kubernetes",
    },
  });

  const resume3 = await prisma.resume.create({
    data: {
      userId: user2.id,
      title: "Master Resume — Data Engineer",
      isMaster: true,
      format: ResumeFormat.STRUCTURED,
      contactInfo: {
        name: "Bob Smith",
        email: "bob@example.com",
        phone: "+1-415-555-0200",
        linkedin: "https://linkedin.com/in/bobsmith",
        location: "San Francisco, CA",
      },
      summary:
        "Data engineer with 4 years of experience building data pipelines and ML infrastructure. Expert in Python, Spark, and Kubernetes.",
      experience: [
        {
          company: "DataCorp",
          title: "Data Engineer",
          location: "San Francisco, CA",
          startDate: "2021-03",
          endDate: null,
          bullets: [
            "Designed and maintained Spark pipelines processing 1TB+ data daily",
            "Built ML feature store on Kubernetes reducing model training time by 40%",
          ],
        },
      ],
      education: [
        {
          school: "UC Berkeley",
          degree: "Master of Science",
          field: "Data Science",
          gpa: "3.9",
          startDate: "2019-09",
          endDate: "2021-05",
        },
      ],
      skills: {
        technical: ["Python", "SQL", "Scala", "R"],
        frameworks: ["Apache Spark", "Airflow", "dbt", "FastAPI"],
        tools: ["Kubernetes", "Docker", "AWS", "Terraform", "Databricks"],
        languages: ["English (native)"],
      },
      parsedContent:
        "Bob Smith | Data Engineer | San Francisco, CA | Python, Spark, Kubernetes, AWS, Airflow, dbt",
    },
  });

  const _resume4 = await prisma.resume.create({
    data: {
      userId: user2.id,
      title: "Tailored — ML Focus",
      isMaster: false,
      format: ResumeFormat.STRUCTURED,
      parsedContent: "Bob Smith | ML Engineer | Python, PyTorch, Kubernetes, MLflow",
    },
  });

  const _resume5 = await prisma.resume.create({
    data: {
      userId: admin.id,
      title: "Admin Resume",
      isMaster: true,
      format: ResumeFormat.STRUCTURED,
    },
  });
  console.log("✅ Resumes seeded");

  // ============================================================
  // SEARCH RUNS
  // ============================================================
  const searchRun1 = await prisma.searchRun.create({
    data: {
      userId: user1.id,
      searchDepth: SearchDepth.STANDARD,
      status: SearchRunStatus.COMPLETED,
      jobsFound: 8,
      jobsMatched: 5,
      apiCalls: 12,
      estimatedCost: 0.85,
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2.8 * 60 * 60 * 1000),
    },
  });

  const searchRun2 = await prisma.searchRun.create({
    data: {
      userId: user1.id,
      searchDepth: SearchDepth.LIGHT,
      status: SearchRunStatus.COMPLETED,
      jobsFound: 4,
      jobsMatched: 2,
      apiCalls: 5,
      estimatedCost: 0.32,
      startedAt: new Date(Date.now() - 27 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 26.9 * 60 * 60 * 1000),
    },
  });

  const searchRun3 = await prisma.searchRun.create({
    data: {
      userId: user2.id,
      searchDepth: SearchDepth.DEEP,
      status: SearchRunStatus.COMPLETED,
      jobsFound: 12,
      jobsMatched: 7,
      apiCalls: 22,
      estimatedCost: 3.15,
      startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4.7 * 60 * 60 * 1000),
    },
  });
  console.log("✅ Search runs seeded");

  // ============================================================
  // JOBS (15 total)
  // ============================================================
  const jobsData = [
    // Alice's jobs (10)
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Full Stack Engineer",
      company: "Stripe",
      location: "Remote",
      url: "https://stripe.com/jobs/listing/full-stack-engineer/1001",
      source: "company_site",
      description:
        "Build scalable payment infrastructure using TypeScript, React, and distributed systems.",
      salaryRange: "$130,000 - $180,000",
      matchScore: 92,
      matchAnalysis: { titleMatch: 95, skillsMatch: 90, experienceMatch: 88, overall: 92 },
      missingKeywords: ["Go", "Kafka"],
      status: JobStatus.BOOKMARKED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Backend Engineer — Payments",
      company: "Square",
      location: "New York, NY",
      url: "https://squareup.com/jobs/backend-engineer-payments-2025",
      source: "linkedin",
      description: "Design and build payment APIs using Node.js, PostgreSQL, and Redis.",
      salaryRange: "$120,000 - $160,000",
      matchScore: 85,
      matchAnalysis: { titleMatch: 80, skillsMatch: 88, experienceMatch: 85, overall: 85 },
      missingKeywords: ["Redis Streams", "Microservices"],
      status: JobStatus.APPLYING,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Software Engineer II",
      company: "Airbnb",
      location: "Remote",
      url: "https://careers.airbnb.com/software-engineer-ii-2025",
      source: "web_search",
      matchScore: 78,
      matchAnalysis: { titleMatch: 85, skillsMatch: 75, experienceMatch: 72, overall: 78 },
      missingKeywords: ["Java", "Kubernetes", "GraphQL"],
      status: JobStatus.DISCOVERED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "TypeScript Developer",
      company: "Vercel",
      location: "Remote",
      url: "https://vercel.com/careers/typescript-developer-2025",
      source: "company_site",
      matchScore: 96,
      matchAnalysis: { titleMatch: 98, skillsMatch: 95, experienceMatch: 93, overall: 96 },
      missingKeywords: [],
      status: JobStatus.APPLIED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Software Engineer",
      company: "Linear",
      location: "Remote",
      url: "https://linear.app/jobs/software-engineer-2025",
      source: "company_site",
      matchScore: 88,
      matchAnalysis: { titleMatch: 90, skillsMatch: 87, experienceMatch: 85, overall: 88 },
      missingKeywords: ["Electron", "WebSockets"],
      status: JobStatus.INTERVIEW,
    },
    {
      userId: user1.id,
      searchRunId: searchRun2.id,
      title: "Junior Software Engineer",
      company: "Shopify",
      location: "Remote",
      url: "https://shopify.com/careers/junior-software-engineer-2025",
      source: "linkedin",
      matchScore: 72,
      matchAnalysis: { titleMatch: 80, skillsMatch: 70, experienceMatch: 65, overall: 72 },
      missingKeywords: ["Ruby", "Rails"],
      status: JobStatus.DISCOVERED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun2.id,
      title: "Frontend Engineer",
      company: "Figma",
      location: "San Francisco, CA",
      url: "https://figma.com/careers/frontend-engineer-2025",
      source: "web_search",
      matchScore: 65,
      matchAnalysis: { titleMatch: 70, skillsMatch: 62, experienceMatch: 60, overall: 65 },
      missingKeywords: ["WebGL", "Canvas", "Design Systems"],
      status: JobStatus.ARCHIVED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Platform Engineer",
      company: "Notion",
      location: "Remote",
      url: "https://notion.so/careers/platform-engineer-2025",
      source: "company_site",
      matchScore: 82,
      matchAnalysis: { titleMatch: 78, skillsMatch: 84, experienceMatch: 82, overall: 82 },
      missingKeywords: ["Rust", "gRPC"],
      status: JobStatus.REJECTED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "API Engineer",
      company: "Twilio",
      location: "Remote",
      url: "https://twilio.com/careers/api-engineer-2025",
      source: "indeed",
      matchScore: 76,
      matchAnalysis: { titleMatch: 75, skillsMatch: 77, experienceMatch: 75, overall: 76 },
      missingKeywords: ["Telephony", "SIP", "WebRTC"],
      status: JobStatus.DISCOVERED,
    },
    {
      userId: user1.id,
      searchRunId: searchRun1.id,
      title: "Full Stack Developer",
      company: "GitHub",
      location: "Remote",
      url: "https://github.com/about/careers/full-stack-developer-2025",
      source: "company_site",
      matchScore: 90,
      matchAnalysis: { titleMatch: 92, skillsMatch: 89, experienceMatch: 88, overall: 90 },
      missingKeywords: ["Ruby"],
      status: JobStatus.BOOKMARKED,
    },
    // Bob's jobs (5)
    {
      userId: user2.id,
      searchRunId: searchRun3.id,
      title: "Senior Data Engineer",
      company: "Databricks",
      location: "Remote",
      url: "https://databricks.com/careers/senior-data-engineer-2025",
      source: "company_site",
      matchScore: 94,
      matchAnalysis: { titleMatch: 90, skillsMatch: 96, experienceMatch: 94, overall: 94 },
      missingKeywords: ["Delta Live Tables"],
      status: JobStatus.APPLYING,
    },
    {
      userId: user2.id,
      searchRunId: searchRun3.id,
      title: "ML Platform Engineer",
      company: "OpenAI",
      location: "San Francisco, CA",
      url: "https://openai.com/careers/ml-platform-engineer-2025",
      source: "linkedin",
      matchScore: 87,
      matchAnalysis: { titleMatch: 88, skillsMatch: 88, experienceMatch: 84, overall: 87 },
      missingKeywords: ["CUDA", "Triton"],
      status: JobStatus.APPLIED,
    },
    {
      userId: user2.id,
      searchRunId: searchRun3.id,
      title: "Data Infrastructure Engineer",
      company: "Spotify",
      location: "Remote",
      url: "https://spotify.com/careers/data-infrastructure-engineer-2025",
      source: "web_search",
      matchScore: 79,
      matchAnalysis: { titleMatch: 80, skillsMatch: 80, experienceMatch: 77, overall: 79 },
      missingKeywords: ["Flink", "Scio"],
      status: JobStatus.DISCOVERED,
    },
    {
      userId: user2.id,
      searchRunId: searchRun3.id,
      title: "Backend Engineer — Data",
      company: "Snowflake",
      location: "Remote",
      url: "https://snowflake.com/careers/backend-engineer-data-2025",
      source: "indeed",
      matchScore: 83,
      matchAnalysis: { titleMatch: 78, skillsMatch: 85, experienceMatch: 84, overall: 83 },
      missingKeywords: ["C++", "Java"],
      status: JobStatus.PHONE_SCREEN,
    },
    {
      userId: user2.id,
      searchRunId: searchRun3.id,
      title: "Data Engineer II",
      company: "Airbnb",
      location: "Remote",
      url: "https://careers.airbnb.com/data-engineer-ii-2025",
      source: "company_site",
      matchScore: 91,
      matchAnalysis: { titleMatch: 92, skillsMatch: 93, experienceMatch: 88, overall: 91 },
      missingKeywords: [],
      status: JobStatus.INTERVIEW,
    },
  ];

  const createdJobs = [];
  for (const job of jobsData) {
    const created = await prisma.job.create({
      data: {
        ...job,
        discoveredAt: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000),
      },
    });
    createdJobs.push(created);
  }
  console.log(`✅ ${createdJobs.length} jobs seeded`);

  // ============================================================
  // JOB CONTACTS (for high-match jobs)
  // ============================================================
  const vercelJob = createdJobs.find((j) => j.company === "Vercel")!;
  await prisma.jobContact.create({
    data: {
      jobId: vercelJob.id,
      name: "Sarah Chen",
      title: "Engineering Manager",
      email: "s.chen@vercel.com",
      emailConfidence: 92,
      linkedinUrl: "https://linkedin.com/in/sarahchen-vercel",
      isAlumni: false,
      relationshipType: ContactRelationType.ENGINEERING_MANAGER,
      outreachPriority: 10,
      profileSummary: "Leads the developer experience team at Vercel",
    },
  });

  const linearJob = createdJobs.find((j) => j.company === "Linear")!;
  await prisma.jobContact.create({
    data: {
      jobId: linearJob.id,
      name: "Jori Lallo",
      title: "CTO & Co-founder",
      linkedinUrl: "https://linkedin.com/in/jorilallo",
      isAlumni: false,
      relationshipType: ContactRelationType.CTO,
      outreachPriority: 7,
      profileSummary: "Co-founder and CTO of Linear",
    },
  });
  console.log("✅ Job contacts seeded");

  // ============================================================
  // APPLICATIONS (5 in different statuses)
  // ============================================================
  const vercelJobForApp = createdJobs.find((j) => j.company === "Vercel" && j.userId === user1.id)!;
  const linearJobForApp = createdJobs.find((j) => j.company === "Linear" && j.userId === user1.id)!;
  const squareJobForApp = createdJobs.find((j) => j.company === "Square")!;
  const databricksJob = createdJobs.find((j) => j.company === "Databricks")!;
  const openaiJob = createdJobs.find((j) => j.company === "OpenAI")!;

  await prisma.application.create({
    data: {
      jobId: vercelJobForApp.id,
      userId: user1.id,
      status: JobStatus.APPLIED,
      appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      appliedVia: "company_site",
      resumeUsed: resume1.id,
      statusHistory: [
        {
          status: "APPLIED",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          source: "manual",
          notes: "Applied via Vercel careers page",
        },
      ],
    },
  });

  await prisma.application.create({
    data: {
      jobId: linearJobForApp.id,
      userId: user1.id,
      status: JobStatus.INTERVIEW,
      appliedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      appliedVia: "company_site",
      resumeUsed: resume2.id,
      statusHistory: [
        {
          status: "APPLIED",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          source: "manual",
        },
        {
          status: "PHONE_SCREEN",
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          source: "email_scan",
          notes: "Phone screen scheduled",
        },
        {
          status: "INTERVIEW",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          source: "manual",
          notes: "Technical interview round 1",
        },
      ],
      interviewDates: [
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: "Technical",
          notes: "System design + coding",
        },
      ],
    },
  });

  await prisma.application.create({
    data: {
      jobId: squareJobForApp.id,
      userId: user1.id,
      status: JobStatus.PHONE_SCREEN,
      appliedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      appliedVia: "linkedin",
      statusHistory: [
        {
          status: "APPLIED",
          date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          source: "manual",
        },
        {
          status: "PHONE_SCREEN",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          source: "email_scan",
        },
      ],
    },
  });

  await prisma.application.create({
    data: {
      jobId: databricksJob.id,
      userId: user2.id,
      status: JobStatus.APPLYING,
      appliedDate: null,
      statusHistory: [],
      notes: "Working on tailoring resume before applying",
    },
  });

  await prisma.application.create({
    data: {
      jobId: openaiJob.id,
      userId: user2.id,
      status: JobStatus.APPLIED,
      appliedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      appliedVia: "company_site",
      resumeUsed: resume3.id,
      statusHistory: [
        {
          status: "APPLIED",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          source: "manual",
        },
      ],
    },
  });
  console.log("✅ Applications seeded");

  // ============================================================
  // OUTREACH DRAFTS
  // ============================================================
  const vercelContact = await prisma.jobContact.findFirst({ where: { jobId: vercelJob.id } });
  if (vercelContact) {
    await prisma.outreachDraft.create({
      data: {
        contactId: vercelContact.id,
        type: OutreachType.EMAIL,
        subject: "Interest in Full Stack Engineer role at Vercel",
        content: `Hi Sarah,\n\nI came across the Full Stack Engineer opening at Vercel and was genuinely excited — I've been building with Next.js for the past year and have a deep appreciation for what your team has built.\n\nI'm a software engineer based in Columbus, OH with experience in TypeScript, React, and Node.js. I'd love to learn more about the role and the DX team's current focus areas.\n\nWould you be open to a brief chat?\n\nBest,\nAlice`,
        status: OutreachStatus.DRAFT,
      },
    });
  }
  console.log("✅ Outreach drafts seeded");

  console.log("\n🎉 Seed complete!");
  console.log(`   Admin: ${adminEmail}`);
  console.log("   Users: alice@example.com, bob@example.com");
  console.log("   Password for all: Password123 (dev only)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
