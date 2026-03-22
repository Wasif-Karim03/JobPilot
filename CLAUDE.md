# MASTER IMPLEMENTATION PLAN — JobPilot

## AI-Powered Autonomous Job Search & Application Management Platform

---

## 1. Project Overview

**JobPilot** is a full SaaS platform that automates the entire job search and application lifecycle. Users provide their master resume, job preferences, and their own Claude API key. The system autonomously searches the web daily for matching jobs, performs deep analysis on each match (description parsing, match scoring, keyword gap analysis), discovers networking connections (alumni, executives, HR contacts), generates personalized outreach drafts, provides an in-platform resume tailoring editor, and auto-tracks application status by monitoring the user's Gmail inbox — all in one unified dashboard.

- **Project name:** JobPilot (placeholder — rename via global find-and-replace)
- **Stage:** Full SaaS platform (multi-tenant, admin panel, production-grade)
- **Target users:** Job seekers (initially tech/engineering roles, expandable to all industries)
- **User roles:** User (job seeker), Admin (platform owner)
- **Scale target:** 100–500 users in first 6 months
- **Timeline:** 6–8 weeks to production-ready V1
- **Build method:** Claude Code builds from this document. This IS the `CLAUDE.md`.
- **Monetization:** Free for now (users pay their own Claude API costs). Billing added later.
- **Solo developer build** — all architecture decisions optimize for solo maintainability.

---

## 2. Tech Stack Manifest

| Layer                         | Technology              | Version         | Why This Over Alternatives                                           |
| ----------------------------- | ----------------------- | --------------- | -------------------------------------------------------------------- |
| Language                      | TypeScript              | 5.4+            | End-to-end type safety, Claude Code works best with TS               |
| Runtime                       | Node.js                 | 20 LTS          | Stable, required by Next.js and worker                               |
| Frontend Framework            | Next.js                 | 14 (App Router) | SSR, API routes, Vercel-native, best DX for solo dev                 |
| UI Components                 | shadcn/ui + Radix       | Latest          | Accessible, customizable, no vendor lock-in                          |
| Styling                       | Tailwind CSS            | 3.4+            | Fast iteration, design tokens, shadcn requires it                    |
| Rich Text Editor              | TipTap                  | 2.x             | Best open-source rich text for React, extensible                     |
| PDF Generation                | @react-pdf/renderer     | 3.x             | Generate tailored resume PDFs client-side                            |
| API Layer                     | tRPC                    | 11.x            | End-to-end type safety with Next.js, zero codegen                    |
| ORM                           | Prisma                  | 5.x             | Type-safe, great migrations, excellent DX                            |
| Primary Database              | PostgreSQL              | 16              | Default best choice, JSONB for flexible data, managed on Railway     |
| Cache / Queue                 | Redis                   | 7.x             | BullMQ job queue + hot data caching, Railway managed                 |
| Job Queue                     | BullMQ                  | 5.x             | Reliable, Redis-backed, retries, dead letter, cron                   |
| Authentication                | Better Auth             | 1.x             | Self-hosted, email/password + Google OAuth, free, modern             |
| File Storage                  | Cloudflare R2           | —               | S3-compatible, 10GB free, no egress fees                             |
| Email Integration             | Gmail API               | v1              | Read-only OAuth2 for application tracking                            |
| Contact Enrichment            | Hunter.io API           | v2              | Email pattern discovery, 25 free searches/mo                         |
| AI Engine                     | Anthropic Claude API    | Messages v1     | User's own API key — Opus 4.6 for research, Sonnet 4.6 for execution |
| Error Tracking                | Sentry                  | Latest          | Free tier, source maps, Next.js integration                          |
| Uptime Monitoring             | BetterStack             | —               | Free tier, status page                                               |
| Hosting (Frontend)            | Vercel                  | —               | Free tier, preview deploys, perfect for Next.js                      |
| Hosting (Worker + DB + Redis) | Railway                 | —               | Managed Postgres + Redis + worker service, ~$5-15/mo                 |
| Package Manager               | pnpm                    | 9.x             | Fast, strict, monorepo-ready                                         |
| Linting                       | ESLint                  | 9.x             | Flat config, TypeScript-aware                                        |
| Formatting                    | Prettier                | 3.x             | Consistent code style                                                |
| Testing                       | Vitest + Playwright     | Latest          | Fast unit tests + E2E for critical paths                             |
| CI/CD                         | GitHub Actions + Vercel | —               | Lint → Type Check → Test → Deploy                                    |

**System Requirements:**

- Node.js 20+
- pnpm 9+
- Docker (local dev: Postgres + Redis)
- Git

**Monthly Cost Estimate at Launch:**

- Railway (Worker + Postgres + Redis): ~$5–15/mo
- Vercel (Frontend): Free tier
- Cloudflare R2: Free tier (10GB storage, 10M reads/mo)
- Sentry: Free tier (5K errors/mo)
- BetterStack: Free tier
- Hunter.io: Free tier (25 searches/mo)
- Domain: ~$12/year
- **Total: ~$7–17/month**

---

## 3. Infrastructure Setup Manifest

Execute these steps IN ORDER. Verify each before proceeding. No application code is written until ALL infrastructure is configured and verified.

```
═══════════════════════════════════════════════════════════
  INFRASTRUCTURE SETUP MANIFEST
  Execute these steps in order. Verify each before proceeding.
═══════════════════════════════════════════════════════════

  STEP 1: Project Initialization
  ────────────────────────────────────────────────────────
  Commands:
    $ mkdir jobpilot && cd jobpilot
    $ pnpm create next-app@14 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    $ mkdir -p worker
    $ cd worker && pnpm init && cd ..
    $ pnpm init -w  (init workspace root)

  Create pnpm-workspace.yaml:
    packages:
      - "web"
      - "worker"
      - "packages/*"

  Install shared dependencies in web/:
    $ cd web
    $ pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query
    $ pnpm add prisma @prisma/client better-auth
    $ pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
    $ pnpm add @react-pdf/renderer
    $ pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
    $ pnpm add googleapis
    $ pnpm add zod superjson date-fns
    $ pnpm add lucide-react class-variance-authority clsx tailwind-merge
    $ pnpm add -D @types/node vitest @vitejs/plugin-react
    $ pnpm add -D prettier eslint-config-prettier

  Install shadcn/ui:
    $ cd web
    $ pnpm dlx shadcn-ui@latest init
    (select: TypeScript, Default style, Slate color, src/ directory, @/components alias)
    $ pnpm dlx shadcn-ui@latest add button card dialog dropdown-menu input label
    $ pnpm dlx shadcn-ui@latest add select tabs toast badge progress separator
    $ pnpm dlx shadcn-ui@latest add sheet command popover calendar avatar
    $ pnpm dlx shadcn-ui@latest add form textarea switch slider checkbox

  Install worker dependencies:
    $ cd worker
    $ pnpm add bullmq ioredis prisma @prisma/client
    $ pnpm add googleapis
    $ pnpm add zod dotenv
    $ pnpm add tsx
    $ pnpm add -D @types/node typescript vitest

  Verify:
    $ cd web && pnpm dev → Dev server starts at localhost:3000
    [ ] VERIFIED

  STEP 2: Docker Local Services
  ────────────────────────────────────────────────────────
  Create docker-compose.yml at project root:

    services:
      postgres:
        image: postgres:16-alpine
        environment:
          POSTGRES_USER: jobpilot
          POSTGRES_PASSWORD: jobpilot_dev
          POSTGRES_DB: jobpilot
        ports:
          - "5432:5432"
        volumes:
          - pgdata:/var/lib/postgresql/data
      redis:
        image: redis:7-alpine
        ports:
          - "6379:6379"
        volumes:
          - redisdata:/data
    volumes:
      pgdata:
      redisdata:

  Commands:
    $ docker compose up -d

  Verify:
    $ docker exec -it $(docker ps -qf "name=postgres") psql -U jobpilot -c "SELECT 1;"
    → Returns: 1
    $ docker exec -it $(docker ps -qf "name=redis") redis-cli ping
    → Returns: PONG
    [ ] VERIFIED

  STEP 3: Database Setup (Railway — Production)
  ────────────────────────────────────────────────────────
  Service: PostgreSQL on Railway
  Setup:
    1. Create Railway account at https://railway.app
    2. New Project → Provision PostgreSQL
    3. Go to Variables tab → Copy DATABASE_URL
    4. Also provision Redis → Copy REDIS_URL

  Environment Variables (Production):
    DATABASE_URL="postgresql://postgres:xxxxx@xxxx.railway.app:5432/railway"
    REDIS_URL="redis://default:xxxxx@xxxx.railway.app:6379"

  Environment Variables (Development):
    DATABASE_URL="postgresql://jobpilot:jobpilot_dev@localhost:5432/jobpilot"
    REDIS_URL="redis://localhost:6379"

  Verify:
    $ cd web && pnpm prisma db push --skip-generate
    → "Your database is now in sync with your Prisma schema"
    [ ] VERIFIED

  STEP 4: Cloudflare R2 Setup
  ────────────────────────────────────────────────────────
  Service: Cloudflare R2 (S3-compatible object storage)
  Setup:
    1. Create Cloudflare account at https://dash.cloudflare.com
    2. Go to R2 → Create Bucket → Name: "jobpilot-resumes"
    3. Settings → Create API Token with Object Read & Write permissions
    4. Note: Account ID, Access Key ID, Secret Access Key
    5. Set CORS: Allow origin *, GET/PUT methods, Content-Type header

  Environment Variables:
    R2_ACCOUNT_ID="your_account_id"
    R2_ACCESS_KEY_ID="your_access_key_id"
    R2_SECRET_ACCESS_KEY="your_secret_access_key"
    R2_BUCKET_NAME="jobpilot-resumes"
    R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"

  Verify:
    $ node -e "
      const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
      const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
      client.send(new ListBucketsCommand({})).then(r => console.log('Buckets:', r.Buckets));
    "
    → Lists your bucket
    [ ] VERIFIED

  STEP 5: Google OAuth + Gmail API Setup
  ────────────────────────────────────────────────────────
  Service: Google Cloud Console
  Setup:
    1. Go to https://console.cloud.google.com
    2. Create Project: "JobPilot"
    3. Enable APIs: Gmail API, Google OAuth2
    4. Credentials → Create OAuth 2.0 Client ID
       - Application type: Web application
       - Authorized redirect URIs:
         - http://localhost:3000/api/auth/callback/google (dev)
         - https://yourdomain.com/api/auth/callback/google (prod)
    5. OAuth consent screen:
       - App name: JobPilot
       - Scopes: openid, email, profile, gmail.readonly
       - Test users: add your email for dev testing

  Environment Variables:
    GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET="your_client_secret"
    GMAIL_SCOPES="https://www.googleapis.com/auth/gmail.readonly"

  Verify:
    → OAuth credentials created, consent screen configured
    [ ] VERIFIED

  STEP 6: Hunter.io API Setup
  ────────────────────────────────────────────────────────
  Service: Hunter.io (contact enrichment)
  Setup:
    1. Create account at https://hunter.io
    2. Go to API → Copy API key
    3. Free tier: 25 searches/month, 50 verifications/month

  Environment Variables:
    HUNTER_API_KEY="your_hunter_api_key"

  Verify:
    $ curl "https://api.hunter.io/v2/account?api_key=$HUNTER_API_KEY"
    → Returns account info with remaining requests
    [ ] VERIFIED

  STEP 7: Sentry Error Tracking
  ────────────────────────────────────────────────────────
  Service: Sentry (error tracking)
  Setup:
    1. Create account at https://sentry.io
    2. Create Project → Next.js
    3. Copy DSN
    4. Install: cd web && pnpm add @sentry/nextjs
    5. Run: pnpm dlx @sentry/wizard@latest -i nextjs

  Environment Variables:
    SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
    SENTRY_AUTH_TOKEN="your_auth_token"

  Verify:
    → Sentry initialized, test error captured in dashboard
    [ ] VERIFIED

  STEP 8: Environment Variables Summary
  ────────────────────────────────────────────────────────
  Create web/.env.example and worker/.env.example:

    # === Database ===
    DATABASE_URL="postgresql://jobpilot:jobpilot_dev@localhost:5432/jobpilot"

    # === Redis ===
    REDIS_URL="redis://localhost:6379"

    # === Better Auth ===
    BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
    BETTER_AUTH_URL="http://localhost:3000"
    NEXTAUTH_URL="http://localhost:3000"

    # === Google OAuth ===
    GOOGLE_CLIENT_ID=""
    GOOGLE_CLIENT_SECRET=""

    # === Gmail API ===
    GMAIL_SCOPES="https://www.googleapis.com/auth/gmail.readonly"

    # === Cloudflare R2 ===
    R2_ACCOUNT_ID=""
    R2_ACCESS_KEY_ID=""
    R2_SECRET_ACCESS_KEY=""
    R2_BUCKET_NAME="jobpilot-resumes"
    R2_ENDPOINT=""

    # === Claude API (NOT stored here — per-user, encrypted in DB) ===
    # Users provide their own API keys during onboarding

    # === Hunter.io ===
    HUNTER_API_KEY=""

    # === Sentry ===
    SENTRY_DSN=""

    # === App ===
    ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
    ADMIN_EMAIL="your-admin-email@gmail.com"

  Verify all connections:
    $ docker compose up -d
    $ cd web && pnpm prisma db push
    $ cd web && pnpm dev
    → App starts, DB connected, Redis connected
    [ ] ALL INFRASTRUCTURE VERIFIED
═══════════════════════════════════════════════════════════
```

---

## 4. Project Structure

```
jobpilot/
├── CLAUDE.md                          # THIS FILE — Master Implementation Plan
├── PROGRESS.md                        # Living progress tracker
├── README.md                          # Developer setup + architecture overview
├── docker-compose.yml                 # Local Postgres + Redis
├── pnpm-workspace.yaml                # Monorepo workspace config
├── package.json                       # Root workspace package.json
│
├── web/                               # Next.js 14 frontend + API
│   ├── .env.example                   # All environment variables
│   ├── .env.local                     # Local dev values (gitignored)
│   ├── next.config.js                 # Next.js config + Sentry
│   ├── tailwind.config.ts             # Tailwind + shadcn theme
│   ├── tsconfig.json                  # TypeScript config
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (single source of truth)
│   │   ├── migrations/                # Auto-generated migration files
│   │   └── seed.ts                    # Development seed data
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root layout (providers, fonts)
│   │   │   ├── page.tsx               # Landing page (public)
│   │   │   ├── (auth)/                # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── onboarding/        # Multi-step onboarding wizard
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/           # Authenticated route group
│   │   │   │   ├── layout.tsx         # Dashboard shell (sidebar, header)
│   │   │   │   ├── dashboard/page.tsx # Main dashboard overview
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx       # Job listings with filters
│   │   │   │   │   └── [id]/page.tsx  # Single job detail + company intel
│   │   │   │   ├── applications/
│   │   │   │   │   └── page.tsx       # Kanban application tracker
│   │   │   │   ├── resume/
│   │   │   │   │   ├── page.tsx       # Master resume manager
│   │   │   │   │   └── [id]/page.tsx  # Resume editor (structured + rich text)
│   │   │   │   ├── outreach/
│   │   │   │   │   └── page.tsx       # Outreach drafts & contact list
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx       # API key, preferences, Gmail connection
│   │   │   ├── admin/                 # Admin-only route group
│   │   │   │   ├── layout.tsx         # Admin layout with guard
│   │   │   │   ├── page.tsx           # Admin dashboard
│   │   │   │   ├── users/page.tsx     # User management
│   │   │   │   └── system/page.tsx    # System health, job queue stats
│   │   │   └── api/
│   │   │       ├── trpc/[trpc]/route.ts    # tRPC handler
│   │   │       ├── auth/[...all]/route.ts  # Better Auth catch-all
│   │   │       ├── gmail/callback/route.ts # Gmail OAuth callback
│   │   │       └── webhooks/
│   │   │           └── stripe/route.ts     # Future: payment webhooks
│   │   ├── components/                # Shared UI components
│   │   │   ├── ui/                    # shadcn/ui components (auto-generated)
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx        # Dashboard sidebar navigation
│   │   │   │   ├── header.tsx         # Dashboard header (user menu, notifications)
│   │   │   │   └── mobile-nav.tsx     # Responsive mobile navigation
│   │   │   ├── jobs/
│   │   │   │   ├── job-card.tsx       # Job listing card component
│   │   │   │   ├── job-filters.tsx    # Filter sidebar (location, match %, etc.)
│   │   │   │   ├── job-detail.tsx     # Full job detail view
│   │   │   │   ├── match-score.tsx    # Circular match percentage display
│   │   │   │   └── company-intel.tsx  # Company contacts + alumni section
│   │   │   ├── resume/
│   │   │   │   ├── structured-form.tsx    # Section-by-section resume form
│   │   │   │   ├── rich-editor.tsx        # TipTap rich text editor
│   │   │   │   ├── resume-preview.tsx     # Live PDF preview
│   │   │   │   └── keyword-suggestions.tsx # Missing keyword pills
│   │   │   ├── applications/
│   │   │   │   ├── kanban-board.tsx    # Drag-and-drop kanban
│   │   │   │   ├── application-card.tsx
│   │   │   │   └── status-timeline.tsx # Application status history
│   │   │   ├── onboarding/
│   │   │   │   ├── step-resume.tsx    # Upload/paste master resume
│   │   │   │   ├── step-preferences.tsx # Job search preferences
│   │   │   │   ├── step-api-key.tsx   # Claude API key input
│   │   │   │   ├── step-gmail.tsx     # Gmail OAuth connection
│   │   │   │   └── step-review.tsx    # Review all settings
│   │   │   └── shared/
│   │   │       ├── loading.tsx        # Skeleton loading states
│   │   │       ├── error-boundary.tsx # Error fallback UI
│   │   │       ├── empty-state.tsx    # Empty state illustrations
│   │   │       └── confirm-dialog.tsx # Reusable confirmation dialog
│   │   ├── server/                    # Server-side code
│   │   │   ├── db.ts                  # Prisma client singleton
│   │   │   ├── auth.ts               # Better Auth configuration
│   │   │   ├── trpc/
│   │   │   │   ├── init.ts           # tRPC initialization + context
│   │   │   │   ├── router.ts         # Root router (merges all routers)
│   │   │   │   └── routers/
│   │   │   │       ├── user.ts        # User profile + settings
│   │   │   │       ├── resume.ts      # Resume CRUD + PDF generation
│   │   │   │       ├── job.ts         # Job listings + search triggers
│   │   │   │       ├── application.ts # Application tracking CRUD
│   │   │   │       ├── outreach.ts    # Contact + outreach draft CRUD
│   │   │   │       ├── settings.ts    # API key + preferences management
│   │   │   │       ├── gmail.ts       # Gmail connection management
│   │   │   │       └── admin.ts       # Admin-only endpoints
│   │   │   └── services/
│   │   │       ├── encryption.ts      # AES-256-GCM for API keys
│   │   │       ├── r2.ts             # Cloudflare R2 client
│   │   │       ├── gmail.ts          # Gmail API client
│   │   │       └── hunter.ts         # Hunter.io API client
│   │   ├── lib/                       # Shared utilities
│   │   │   ├── utils.ts              # cn() helper, general utils
│   │   │   ├── errors.ts             # Custom error classes
│   │   │   ├── logger.ts             # Structured JSON logger
│   │   │   ├── constants.ts          # App-wide constants
│   │   │   ├── validations.ts        # Shared Zod schemas
│   │   │   └── trpc-client.ts        # tRPC React client setup
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-local-storage.ts
│   │   │   └── use-media-query.ts
│   │   ├── stores/                    # Zustand stores (client state)
│   │   │   ├── onboarding-store.ts   # Multi-step form state
│   │   │   └── kanban-store.ts       # Kanban drag state
│   │   └── types/                     # Shared TypeScript types
│   │       ├── index.ts              # Re-exports
│   │       ├── job.ts                # Job-related types
│   │       ├── resume.ts             # Resume types
│   │       └── api.ts                # API response types
│   ├── public/
│   │   ├── favicon.ico
│   │   └── images/                   # Static assets
│   └── tests/
│       ├── unit/                     # Vitest unit tests
│       ├── integration/              # API integration tests
│       └── e2e/                      # Playwright E2E tests
│
├── worker/                            # Background job processor
│   ├── .env.example
│   ├── .env.local
│   ├── tsconfig.json
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                  # Worker entry point — starts all queues
│   │   ├── queues/
│   │   │   ├── job-search.queue.ts   # Daily job search queue definition
│   │   │   ├── email-scan.queue.ts   # Gmail scanning queue definition
│   │   │   ├── company-intel.queue.ts # Company research queue definition
│   │   │   └── match-analysis.queue.ts # Resume-job matching queue
│   │   ├── processors/
│   │   │   ├── job-search.processor.ts   # Claude API web search → find jobs
│   │   │   ├── email-scan.processor.ts   # Gmail API → parse app status
│   │   │   ├── company-intel.processor.ts # Claude API → research company
│   │   │   └── match-analysis.processor.ts # Claude API → score + analyze
│   │   ├── services/
│   │   │   ├── claude.ts             # Claude API client (uses user's key)
│   │   │   ├── gmail.ts             # Gmail API read operations
│   │   │   ├── hunter.ts            # Hunter.io enrichment
│   │   │   └── encryption.ts        # Shared encryption (same as web)
│   │   ├── lib/
│   │   │   ├── redis.ts             # Redis/IORedis connection
│   │   │   ├── db.ts                # Prisma client
│   │   │   ├── logger.ts            # Structured logger
│   │   │   └── errors.ts            # Custom error classes
│   │   └── cron/
│   │       ├── scheduler.ts         # Cron job definitions
│   │       ├── daily-search.ts      # 8am daily: enqueue search for all users
│   │       └── email-check.ts       # Hourly: enqueue email scan for all users
│   └── tests/
│       └── unit/
│
├── packages/                          # Shared packages (monorepo)
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types.ts              # Types shared between web + worker
│           ├── constants.ts          # Constants shared between web + worker
│           └── encryption.ts         # Encryption utilities (single source)
│
├── docs/
│   ├── ARCHITECTURE.md               # System design decisions
│   ├── API.md                        # API documentation (auto from tRPC)
│   ├── DATABASE.md                   # Schema documentation
│   └── DEPLOYMENT.md                 # Deploy + incident response
│
├── scripts/
│   ├── setup.sh                      # One-command dev setup
│   ├── seed.ts                       # Database seeding
│   └── verify-infra.sh              # Infrastructure verification
│
└── .github/
    └── workflows/
        ├── ci.yml                    # Lint → Type → Test → Build
        └── deploy-worker.yml         # Deploy worker to Railway
```

---

## 5. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum UserRole {
  USER
  ADMIN
}

enum SearchDepth {
  LIGHT      // ~$1-2/run: Major boards only, title match
  STANDARD   // ~$3-5/run: Boards + web search, description analysis
  DEEP       // ~$8-15/run: Everything + company research + contacts
}

enum JobStatus {
  DISCOVERED    // Found by search, not yet reviewed
  BOOKMARKED    // User marked as interesting
  APPLYING      // User is preparing application
  APPLIED       // Application submitted
  PHONE_SCREEN  // Phone screen scheduled/completed
  INTERVIEW     // Interview stage
  OFFER         // Received offer
  REJECTED      // Rejected at any stage
  WITHDRAWN     // User withdrew
  ARCHIVED      // User dismissed
}

enum OutreachType {
  EMAIL
  LINKEDIN
}

enum OutreachStatus {
  DRAFT
  SENT
  REPLIED
  NO_RESPONSE
}

enum ContactRelationType {
  ALUMNI
  CEO
  CTO
  VP_ENGINEERING
  ENGINEERING_MANAGER
  HR_RECRUITER
  HIRING_MANAGER
  EMPLOYEE
  OTHER
}

enum SearchRunStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum ResumeFormat {
  STRUCTURED   // Built from structured form
  RICH_TEXT    // Built from TipTap editor
  UPLOADED     // Uploaded PDF/DOCX parsed
}

// ============================================================
// CORE TABLES
// ============================================================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  passwordHash    String?   @map("password_hash")
  googleId        String?   @unique @map("google_id")
  avatarUrl       String?   @map("avatar_url")
  role            UserRole  @default(USER)
  onboardingComplete Boolean @default(false) @map("onboarding_complete")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  apiConfig       UserApiConfig?
  preferences     JobPreferences?
  gmailConnection GmailConnection?
  resumes         Resume[]
  jobs            Job[]
  applications    Application[]
  searchRuns      SearchRun[]
  sessions        Session[]
  accounts        Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  accountId         String  @map("account_id")
  providerId        String  @map("provider_id")
  accessToken       String? @map("access_token")
  refreshToken      String? @map("refresh_token")
  accessTokenExpiresAt DateTime? @map("access_token_expires_at")
  scope             String?
  idToken           String? @map("id_token")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("verifications")
}

// ============================================================
// USER CONFIGURATION
// ============================================================

model UserApiConfig {
  id                   String      @id @default(cuid())
  userId               String      @unique @map("user_id")
  claudeApiKeyEncrypted String     @map("claude_api_key_encrypted")
  claudeApiKeyIv       String      @map("claude_api_key_iv")
  researchModel        String      @default("claude-opus-4-6") @map("research_model")
  executionModel       String      @default("claude-sonnet-4-6") @map("execution_model")
  searchDepth          SearchDepth @default(STANDARD) @map("search_depth")
  dailySearchEnabled   Boolean     @default(true) @map("daily_search_enabled")
  maxDailyApiCost      Float       @default(10.0) @map("max_daily_api_cost")
  createdAt            DateTime    @default(now()) @map("created_at")
  updatedAt            DateTime    @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_api_configs")
}

model JobPreferences {
  id               String   @id @default(cuid())
  userId           String   @unique @map("user_id")
  targetTitles     String[] @map("target_titles")         // ["Backend Engineer", "Software Engineer", "Robotics Engineer"]
  targetLocations  String[] @map("target_locations")       // ["Columbus, OH", "Remote", "San Francisco, CA"]
  remotePreference String   @default("any") @map("remote_preference") // "remote", "hybrid", "onsite", "any"
  salaryMin        Int?     @map("salary_min")
  salaryMax        Int?     @map("salary_max")
  companySizes     String[] @map("company_sizes")          // ["startup", "small", "mid", "large", "enterprise"]
  industries       String[] @map("industries")             // ["tech", "robotics", "fintech", "healthcare"]
  excludeCompanies String[] @map("exclude_companies")      // Companies to skip
  experienceLevel  String   @default("entry") @map("experience_level") // "intern", "entry", "mid", "senior"
  visaSponsorship  Boolean  @default(false) @map("visa_sponsorship")  // Whether sponsorship needed
  keywords         String[] @map("keywords")               // Additional keywords to search
  searchTime       String   @default("08:00") @map("search_time")    // Daily search time (HH:MM)
  timezone         String   @default("America/New_York")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("job_preferences")
}

model GmailConnection {
  id                    String   @id @default(cuid())
  userId                String   @unique @map("user_id")
  gmailEmail            String   @map("gmail_email")
  accessTokenEncrypted  String   @map("access_token_encrypted")
  accessTokenIv         String   @map("access_token_iv")
  refreshTokenEncrypted String   @map("refresh_token_encrypted")
  refreshTokenIv        String   @map("refresh_token_iv")
  tokenExpiry           DateTime @map("token_expiry")
  lastScanAt            DateTime? @map("last_scan_at")
  isActive              Boolean  @default(true) @map("is_active")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("gmail_connections")
}

// ============================================================
// RESUME MANAGEMENT
// ============================================================

model Resume {
  id              String       @id @default(cuid())
  userId          String       @map("user_id")
  title           String       @default("Master Resume")
  isMaster        Boolean      @default(false) @map("is_master")
  format          ResumeFormat @default(STRUCTURED)

  // Structured data (JSON)
  contactInfo     Json?        @map("contact_info")       // {name, email, phone, linkedin, github, website, location}
  summary         String?                                  // Professional summary text
  experience      Json?                                    // [{company, title, location, startDate, endDate, bullets}]
  education       Json?                                    // [{school, degree, field, gpa, startDate, endDate, honors}]
  skills          Json?                                    // {technical: [], frameworks: [], tools: [], languages: []}
  projects        Json?                                    // [{name, description, tech, url, bullets}]
  certifications  Json?                                    // [{name, issuer, date, url}]
  customSections  Json?        @map("custom_sections")    // [{title, items: [{text}]}]

  // Rich text content (TipTap JSON)
  richTextContent Json?        @map("rich_text_content")

  // Generated PDF
  pdfUrl          String?      @map("pdf_url")            // R2 URL
  pdfGeneratedAt  DateTime?    @map("pdf_generated_at")

  // Raw uploaded file
  rawFileUrl      String?      @map("raw_file_url")       // Original upload if applicable
  parsedContent   String?      @map("parsed_content")     // Plain text extraction for matching

  version         Int          @default(1)
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  tailoredFor     TailoredResume[]

  @@index([userId, isMaster])
  @@map("resumes")
}

// ============================================================
// JOB DISCOVERY & ANALYSIS
// ============================================================

model Job {
  id               String    @id @default(cuid())
  userId           String    @map("user_id")
  searchRunId      String?   @map("search_run_id")

  // Core job data
  title            String
  company          String
  location         String?
  url              String                              // Original job posting URL
  source           String                              // "web_search", "indeed", "linkedin", "company_site"
  description      String?   @db.Text                  // Full job description
  salaryRange      String?   @map("salary_range")      // Extracted salary info
  postedDate       DateTime? @map("posted_date")       // When the job was posted
  discoveredAt     DateTime  @default(now()) @map("discovered_at")

  // Match analysis (populated by worker)
  matchScore       Float?    @map("match_score")       // 0-100 percentage
  matchAnalysis    Json?     @map("match_analysis")    // {titleMatch, skillsMatch, experienceMatch, details}
  missingKeywords  String[]  @map("missing_keywords")  // Keywords to add to resume
  matchSuggestions Json?     @map("match_suggestions") // Specific resume improvement tips

  // Company intelligence (populated by worker for high-match jobs)
  companyInfo      Json?     @map("company_info")      // {size, industry, description, founded, headquarters}

  // Status
  status           JobStatus @default(DISCOVERED)
  isHidden         Boolean   @default(false) @map("is_hidden")
  userNotes        String?   @map("user_notes")

  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  user             User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  searchRun        SearchRun? @relation(fields: [searchRunId], references: [id])
  contacts         JobContact[]
  application      Application?
  tailoredResumes  TailoredResume[]

  @@index([userId, status])
  @@index([userId, matchScore])
  @@index([userId, discoveredAt])
  @@index([company])
  @@unique([userId, url])   // Prevent duplicate jobs per user
  @@map("jobs")
}

model JobContact {
  id               String              @id @default(cuid())
  jobId            String              @map("job_id")
  name             String
  title            String?
  email            String?
  emailConfidence  Int?                @map("email_confidence")  // Hunter.io confidence score
  linkedinUrl      String?             @map("linkedin_url")
  isAlumni         Boolean             @default(false) @map("is_alumni")
  alumniSchool     String?             @map("alumni_school")
  relationshipType ContactRelationType @map("relationship_type")
  outreachPriority Int                 @default(0) @map("outreach_priority") // Higher = reach out first
  profileSummary   String?             @map("profile_summary")  // Brief context from research
  createdAt        DateTime            @default(now()) @map("created_at")

  job              Job                 @relation(fields: [jobId], references: [id], onDelete: Cascade)
  outreachDrafts   OutreachDraft[]

  @@index([jobId])
  @@map("job_contacts")
}

model OutreachDraft {
  id          String         @id @default(cuid())
  contactId   String         @map("contact_id")
  type        OutreachType
  subject     String?                          // Email subject line
  content     String         @db.Text          // Email body or LinkedIn note (<=200 chars for LinkedIn)
  status      OutreachStatus @default(DRAFT)
  sentAt      DateTime?      @map("sent_at")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  contact     JobContact     @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId])
  @@map("outreach_drafts")
}

// ============================================================
// APPLICATION TRACKING
// ============================================================

model Application {
  id             String    @id @default(cuid())
  jobId          String    @unique @map("job_id")
  userId         String    @map("user_id")
  status         JobStatus @default(APPLIED)
  appliedDate    DateTime? @map("applied_date")
  appliedVia     String?   @map("applied_via")        // "company_site", "linkedin", "indeed", "referral"
  statusHistory  Json      @default("[]") @map("status_history") // [{status, date, source, notes}]
  interviewDates Json?     @map("interview_dates")    // [{date, type, notes}]
  notes          String?   @db.Text
  resumeUsed     String?   @map("resume_used")        // Resume ID used for this application
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  job            Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@map("applications")
}

model TailoredResume {
  id              String   @id @default(cuid())
  jobId           String   @map("job_id")
  baseResumeId    String   @map("base_resume_id")
  userId          String   @map("user_id")
  changes         Json?                            // {addedKeywords, modifiedSections, summary}
  richTextContent Json?    @map("rich_text_content")
  pdfUrl          String?  @map("pdf_url")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  baseResume      Resume   @relation(fields: [baseResumeId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@unique([jobId, baseResumeId])
  @@map("tailored_resumes")
}

// ============================================================
// EMAIL SCANNING
// ============================================================

model EmailScan {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  gmailMessageId  String    @map("gmail_message_id")
  subject         String?
  sender          String?
  bodySnippet     String?   @map("body_snippet") @db.Text
  detectedCompany String?   @map("detected_company")
  detectedStatus  JobStatus? @map("detected_status")
  confidence      Float?                          // How confident is the status detection
  linkedJobId     String?   @map("linked_job_id")
  processed       Boolean   @default(false)
  scannedAt       DateTime  @default(now()) @map("scanned_at")

  @@unique([userId, gmailMessageId])
  @@index([userId, scannedAt])
  @@map("email_scans")
}

// ============================================================
// SEARCH RUNS (AUDIT + MONITORING)
// ============================================================

model SearchRun {
  id            String          @id @default(cuid())
  userId        String          @map("user_id")
  searchDepth   SearchDepth     @map("search_depth")
  status        SearchRunStatus @default(QUEUED)
  jobsFound     Int             @default(0) @map("jobs_found")
  jobsMatched   Int             @default(0) @map("jobs_matched")
  apiCalls      Int             @default(0) @map("api_calls")
  estimatedCost Float           @default(0) @map("estimated_cost")
  errorLog      String?         @map("error_log") @db.Text
  startedAt     DateTime?       @map("started_at")
  completedAt   DateTime?       @map("completed_at")
  createdAt     DateTime        @default(now()) @map("created_at")

  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs          Job[]

  @@index([userId, createdAt])
  @@map("search_runs")
}
```

**Indexes rationale:**

- `users.email` — unique, login lookup
- `jobs(userId, status)` — dashboard filtering by status
- `jobs(userId, matchScore)` — sorting by best match
- `jobs(userId, discoveredAt)` — chronological job feed
- `jobs(userId, url)` — unique constraint prevents duplicate jobs
- `applications(userId, status)` — kanban board query
- `search_runs(userId, createdAt)` — search history

---

## 6. API Specification

### tRPC Router Structure

All API endpoints use tRPC for end-to-end type safety. Each router maps to a domain module.

**Standard Error Response Format:**

```typescript
{
  code: "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR",
  message: string,  // Human-readable
  details?: Record<string, string[]>  // Field-level validation errors
}
```

### 6.1 User Router (`user.ts`)

```
user.getProfile
  Auth: authenticated
  Returns: { id, email, name, avatarUrl, role, onboardingComplete, createdAt }

user.updateProfile
  Auth: authenticated
  Input: { name?: string, avatarUrl?: string }
  Validation: name 1-100 chars
  Returns: updated user

user.deleteAccount
  Auth: authenticated
  Input: { confirmEmail: string }  // Must match their email
  Side effects: Cascading delete of all user data, revoke Gmail tokens, delete R2 files
  Returns: { success: true }
```

### 6.2 Settings Router (`settings.ts`)

```
settings.getApiConfig
  Auth: authenticated
  Returns: { hasApiKey: boolean, researchModel, executionModel, searchDepth, dailySearchEnabled, maxDailyApiCost }
  NOTE: Never returns the actual API key — only whether one exists

settings.setApiKey
  Auth: authenticated
  Input: { apiKey: string }
  Validation: starts with "sk-ant-", length 40-200
  Side effects: Encrypts with AES-256-GCM, stores encrypted + IV
  Returns: { success: true }

settings.validateApiKey
  Auth: authenticated
  Side effects: Makes a minimal Claude API call to verify the key works
  Returns: { valid: boolean, error?: string }

settings.updateApiConfig
  Auth: authenticated
  Input: { researchModel?, executionModel?, searchDepth?, dailySearchEnabled?, maxDailyApiCost? }
  Validation: models must be valid Anthropic model strings, cost 1.0-100.0
  Returns: updated config

settings.getPreferences
  Auth: authenticated
  Returns: full JobPreferences object

settings.updatePreferences
  Auth: authenticated
  Input: Partial<JobPreferences> (all fields optional)
  Validation: targetTitles max 10 items, targetLocations max 10 items, salaryMin < salaryMax
  Returns: updated preferences
```

### 6.3 Resume Router (`resume.ts`)

```
resume.list
  Auth: authenticated
  Returns: Resume[] (without full content, sorted by updatedAt desc)

resume.getById
  Auth: authenticated
  Input: { id: string }
  Authorization: must own this resume
  Returns: full Resume with all content

resume.create
  Auth: authenticated
  Input: { title, format, contactInfo?, summary?, experience?, education?, skills?, projects?, certifications?, customSections?, richTextContent? }
  Validation: title 1-200 chars
  Returns: created Resume

resume.update
  Auth: authenticated
  Input: { id, ...partial fields }
  Authorization: must own this resume
  Side effects: increments version
  Returns: updated Resume

resume.setMaster
  Auth: authenticated
  Input: { id: string }
  Side effects: unsets previous master resume, sets this one
  Returns: { success: true }

resume.generatePdf
  Auth: authenticated
  Input: { id: string }
  Side effects: generates PDF, uploads to R2, stores URL
  Returns: { pdfUrl: string }

resume.delete
  Auth: authenticated
  Input: { id: string }
  Validation: cannot delete master resume
  Authorization: must own
  Returns: { success: true }

resume.parseUpload
  Auth: authenticated
  Input: { fileUrl: string, fileType: "pdf" | "docx" }
  Side effects: extracts text content, populates structured fields where possible
  Returns: { parsedContent: string, structuredData: Partial<Resume> }
```

### 6.4 Job Router (`job.ts`)

```
job.list
  Auth: authenticated
  Input: { status?, minMatchScore?, maxMatchScore?, company?, search?, sortBy?, page?, pageSize? }
  Validation: page >= 1, pageSize 10-50
  Returns: { jobs: Job[], totalCount, page, pageSize, totalPages }
  NOTE: Always paginated. Default sort: discoveredAt desc.

job.getById
  Auth: authenticated
  Input: { id: string }
  Authorization: must own this job
  Returns: full Job with contacts, outreach drafts, tailored resumes

job.updateStatus
  Auth: authenticated
  Input: { id: string, status: JobStatus }
  Authorization: must own
  Returns: updated Job

job.updateNotes
  Auth: authenticated
  Input: { id: string, notes: string }
  Returns: updated Job

job.hide
  Auth: authenticated
  Input: { id: string }
  Returns: { success: true }

job.triggerSearch
  Auth: authenticated
  Input: { depth?: SearchDepth }
  Rate limit: 1 manual trigger per hour
  Side effects: enqueues a search job for this user
  Returns: { searchRunId: string }

job.getSearchHistory
  Auth: authenticated
  Input: { page?, pageSize? }
  Returns: { runs: SearchRun[], totalCount }
```

### 6.5 Application Router (`application.ts`)

```
application.list
  Auth: authenticated
  Input: { status? }
  Returns: Application[] with associated Job (company, title, matchScore)

application.create
  Auth: authenticated
  Input: { jobId, appliedVia?, resumeUsed?, appliedDate?, notes? }
  Side effects: updates Job status to APPLIED, creates statusHistory entry
  Returns: created Application

application.updateStatus
  Auth: authenticated
  Input: { id, status, notes? }
  Side effects: appends to statusHistory with timestamp
  Returns: updated Application

application.addNote
  Auth: authenticated
  Input: { id, notes: string }
  Returns: updated Application

application.getKanbanData
  Auth: authenticated
  Returns: { columns: { [status]: Application[] } }
  NOTE: Groups applications by status for kanban board
```

### 6.6 Outreach Router (`outreach.ts`)

```
outreach.getContactsForJob
  Auth: authenticated
  Input: { jobId: string }
  Returns: JobContact[] with outreach drafts

outreach.generateDraft
  Auth: authenticated
  Input: { contactId: string, type: OutreachType }
  Side effects: uses Claude API (user's key) to generate personalized draft
  Returns: created OutreachDraft

outreach.updateDraft
  Auth: authenticated
  Input: { id, content, subject? }
  Validation: LinkedIn content max 200 chars
  Returns: updated OutreachDraft

outreach.markSent
  Auth: authenticated
  Input: { id: string }
  Returns: updated OutreachDraft with sentAt
```

### 6.7 Gmail Router (`gmail.ts`)

```
gmail.getConnectionStatus
  Auth: authenticated
  Returns: { connected: boolean, email?: string, lastScanAt?, isActive? }

gmail.initiateOAuth
  Auth: authenticated
  Returns: { authUrl: string }  // Redirect URL for Google OAuth

gmail.disconnect
  Auth: authenticated
  Side effects: revokes tokens, deletes connection
  Returns: { success: true }

gmail.triggerScan
  Auth: authenticated
  Rate limit: 1 manual scan per 15 minutes
  Side effects: enqueues email scan job
  Returns: { success: true }

gmail.getRecentScans
  Auth: authenticated
  Input: { limit?: number }
  Returns: EmailScan[] (most recent first)
```

### 6.8 Admin Router (`admin.ts`)

```
admin.getDashboard
  Auth: ADMIN role required
  Returns: { totalUsers, activeUsers (last 7d), totalJobs, totalSearchRuns, totalApplications,
             recentSignups: User[], systemHealth: { dbStatus, redisStatus, workerStatus } }

admin.listUsers
  Auth: ADMIN
  Input: { search?, page?, pageSize? }
  Returns: paginated User list with stats (jobCount, applicationCount, lastSearchRun)

admin.getUserDetail
  Auth: ADMIN
  Input: { userId: string }
  Returns: full user profile + stats + recent activity

admin.getQueueStats
  Auth: ADMIN
  Returns: { jobSearch: { waiting, active, completed, failed }, emailScan: {...}, companyIntel: {...} }

admin.getSystemHealth
  Auth: ADMIN
  Returns: { database: "connected" | "error", redis: "connected" | "error",
             worker: "running" | "stopped", lastSearchRun: DateTime, errorRate: number }
```

### Rate Limiting

| Endpoint Category                | Limit                    |
| -------------------------------- | ------------------------ |
| Auth endpoints (login, register) | 5 requests / 15 min / IP |
| API key validation               | 3 requests / min / user  |
| Manual search trigger            | 1 / hour / user          |
| Manual email scan                | 1 / 15 min / user        |
| Outreach generation              | 10 / hour / user         |
| General API                      | 100 / min / user         |
| Admin endpoints                  | 60 / min / user          |

---

## 7. Authentication & Authorization

### Auth Configuration (Better Auth)

```typescript
// src/server/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // Enable in production when email service added
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["openid", "email", "profile"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cookie cache
    },
  },
  advanced: {
    cookiePrefix: "jobpilot",
    generateId: () => createId(), // cuid2
  },
});
```

### Auth Flow

1. **Registration:** Email + password OR Google OAuth → User created → Redirect to `/onboarding`
2. **Onboarding (multi-step):**
   - Step 1: Upload/paste master resume
   - Step 2: Set job preferences (titles, locations, remote, salary, etc.)
   - Step 3: Paste Claude API key + select models + set search depth
   - Step 4: Connect Gmail (optional, can skip)
   - Step 5: Review all settings → Mark onboarding complete
3. **Login:** Email + password OR Google → Session cookie → Redirect to `/dashboard`
4. **Session:** HTTP-only secure cookie, 7-day expiry, auto-refresh every 24h
5. **Logout:** Clear session from DB + clear cookie

### Authorization Middleware

```typescript
// tRPC context checks
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const onboardedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.onboardingComplete) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Complete onboarding first" });
  }
  return next({ ctx });
});
```

### Security Headers (Next.js middleware)

```typescript
// next.config.js headers
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
}
```

### Encryption Service (API Keys)

```typescript
// packages/shared/src/encryption.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encrypted: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const [encryptedData, authTag] = encrypted.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

---

## 8. Frontend Architecture

### Page Hierarchy & Auth Requirements

| Route           | Auth                        | Role  | Description                                 |
| --------------- | --------------------------- | ----- | ------------------------------------------- |
| `/`             | Public                      | —     | Landing page                                |
| `/login`        | Public (redirect if authed) | —     | Login form                                  |
| `/register`     | Public (redirect if authed) | —     | Registration form                           |
| `/onboarding`   | Authenticated               | USER  | Multi-step onboarding wizard                |
| `/dashboard`    | Authenticated + Onboarded   | USER  | Overview: recent jobs, stats, quick actions |
| `/jobs`         | Authenticated + Onboarded   | USER  | Job listings with filters and sorting       |
| `/jobs/[id]`    | Authenticated + Onboarded   | USER  | Job detail + company intel + contacts       |
| `/applications` | Authenticated + Onboarded   | USER  | Kanban application tracker                  |
| `/resume`       | Authenticated + Onboarded   | USER  | Resume list + master resume                 |
| `/resume/[id]`  | Authenticated + Onboarded   | USER  | Resume editor (structured + rich text)      |
| `/outreach`     | Authenticated + Onboarded   | USER  | All contacts + outreach drafts              |
| `/settings`     | Authenticated               | USER  | API key, preferences, Gmail, account        |
| `/admin`        | Authenticated               | ADMIN | Admin dashboard                             |
| `/admin/users`  | Authenticated               | ADMIN | User management                             |
| `/admin/system` | Authenticated               | ADMIN | System health + queue stats                 |

### State Management

- **Server state:** TanStack Query (via tRPC React hooks) — all API data
- **Client state:** Zustand — onboarding wizard form state, kanban drag state
- **URL state:** Next.js searchParams — job filters, pagination, active tab

### Data Fetching Pattern

Every data-fetching component follows this pattern:

```typescript
function JobList() {
  const { data, isLoading, error } = trpc.job.list.useQuery({ page: 1, pageSize: 20 });

  if (isLoading) return <JobListSkeleton />;  // Always skeleton loading
  if (error) return <ErrorState message={error.message} retry={() => refetch()} />;
  if (!data?.jobs.length) return <EmptyState icon={Briefcase} message="No jobs found yet" />;

  return <div>{data.jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

**Rules:**

- Every data-fetching component has a loading skeleton, error state, and empty state
- Mutations use optimistic updates for status changes
- Stale time: 5 minutes for job listings, 1 minute for application status
- Infinite scroll for job listings (cursor-based)

### Responsive Design

- **Mobile-first** approach
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Dashboard sidebar collapses to bottom nav on mobile
- Job list switches from grid to stacked cards on mobile
- Resume editor: structured form on mobile, split-pane (editor + preview) on desktop

### Accessibility

- WCAG 2.1 AA compliance target
- All interactive elements keyboard-navigable
- ARIA labels on icon-only buttons
- Focus ring visible on all focusable elements
- Color contrast minimum 4.5:1 for normal text
- Screen reader announcements for status changes (toast notifications)

---

## 9. Backend Architecture

### Middleware Stack (ordered)

1. **Logging** — Log request method, path, duration, status code (structured JSON)
2. **Security headers** — HSTS, CSP, X-Frame-Options, etc.
3. **Rate limiting** — Per-IP for auth endpoints, per-user for API
4. **Authentication** — Better Auth session validation
5. **Authorization** — Role + ownership checks per procedure
6. **Validation** — Zod schemas on all inputs
7. **Error handling** — Catch-all, format to standard error response

### Custom Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", 404, `${resource} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", 403, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super("VALIDATION_ERROR", 400, "Validation failed", details);
  }
}

export class ApiKeyError extends AppError {
  constructor(message = "Invalid or expired API key") {
    super("API_KEY_ERROR", 401, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super("RATE_LIMITED", 429, `Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}
```

### Background Jobs (BullMQ)

#### Job: `daily-job-search`

- **Trigger:** Cron — every day, iterates users by their preferred `searchTime` and timezone
- **Input:** `{ userId: string, searchDepth: SearchDepth }`
- **Logic:**
  1. Fetch user's preferences, master resume parsed content, and API config
  2. Decrypt user's Claude API key
  3. Based on search depth:
     - **LIGHT:** 2-3 Claude API calls with web search — search for exact job titles on major boards
     - **STANDARD:** 5-8 calls — broader title variations, web search for company career pages, description analysis
     - **DEEP:** 10-20 calls — everything above + company research + contact discovery + alumni search
  4. For each job found:
     a. Check if URL already exists for this user (dedup)
     b. Parse title, company, location, salary from search results
     c. If STANDARD+: fetch full job description via web search, analyze match with resume
     d. If match score >= 80%: trigger `company-intel` job
     e. Store in `jobs` table
  5. Update `search_runs` with stats
- **Retry:** 3 attempts, exponential backoff (1m, 5m, 15m)
- **Timeout:** 10 minutes per user
- **Dead letter:** Log error, mark search run as FAILED, send notification

#### Job: `match-analysis`

- **Trigger:** After job discovery, for STANDARD+ depth
- **Input:** `{ jobId: string, userId: string }`
- **Logic:**
  1. Fetch job description + user's master resume
  2. Call Claude (Sonnet) with structured prompt:
     - Title relevance (0-100)
     - Skills match (0-100, with specific matches/gaps)
     - Experience level match (0-100)
     - Overall score (weighted average)
     - Missing keywords list
     - Resume improvement suggestions
  3. Update job record with matchScore, matchAnalysis, missingKeywords, matchSuggestions
- **Retry:** 2 attempts
- **Timeout:** 2 minutes

#### Job: `company-intel`

- **Trigger:** When matchScore >= 80% OR user manually requests
- **Input:** `{ jobId: string, userId: string }`
- **Logic:**
  1. Use Claude (Opus) with web search to research:
     - Company info (size, industry, headquarters, description)
     - Current CEO, CTO, VP Eng, Engineering Manager names
     - HR/Recruiter names from LinkedIn (via web search)
     - Alumni from user's school at this company
  2. For each contact found:
     - Use Hunter.io to find email pattern/email (if within free tier quota)
     - Store as JobContact with relationship type and priority
  3. Generate outreach recommendations:
     - Which contact to reach out to first (priority scoring)
     - LinkedIn connection note draft (under 200 chars)
     - Cold email draft
  4. Store all data
- **Retry:** 2 attempts
- **Timeout:** 5 minutes

#### Job: `email-scan`

- **Trigger:** Cron — hourly for all users with active Gmail connections
- **Input:** `{ userId: string }`
- **Logic:**
  1. Fetch user's Gmail connection, decrypt tokens
  2. Refresh access token if expired
  3. Query Gmail API: messages received since last scan, filter by job-related subjects
     - Search query: `{is:inbox newer_than:1h (subject:application OR subject:interview OR subject:offer OR subject:position OR subject:opportunity OR from:greenhouse.io OR from:lever.co OR from:workday OR from:icims)}`
  4. For each message:
     - Extract subject, sender, body snippet
     - Use Claude (Sonnet) to classify:
       - Is this job-related? (yes/no)
       - What company? (extract)
       - What status? (applied confirmation, rejection, phone screen invite, interview invite, offer, other)
       - Confidence score
     - Try to match to existing job by company name
     - Store as EmailScan
     - If high confidence + matched job: auto-update application status
  5. Update lastScanAt on Gmail connection
- **Retry:** 2 attempts
- **Timeout:** 3 minutes

### Cron Schedule

| Job                    | Schedule                     | Description                                                                 |
| ---------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `daily-search-enqueue` | `0 * * * *` (every hour)     | Check which users' search time matches current hour, enqueue their searches |
| `email-scan-enqueue`   | `0 * * * *` (every hour)     | Enqueue email scans for all users with active Gmail                         |
| `stale-search-cleanup` | `0 3 * * *` (3am daily)      | Mark RUNNING searches older than 30min as FAILED                            |
| `token-refresh`        | `*/30 * * * *` (every 30min) | Refresh Gmail tokens expiring within 1 hour                                 |

### Structured Logging

```typescript
// lib/logger.ts
import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: { service: process.env.SERVICE_NAME || "jobpilot-web" },
  transports: [new transports.Console()],
});

// Usage:
// logger.info("Job search completed", { userId, jobsFound: 15, duration: 4500 });
// logger.error("Claude API call failed", { userId, error: err.message, model: "opus" });
```

### Claude API Client (Worker)

```typescript
// worker/src/services/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "@jobpilot/shared/encryption";

export async function createClaudeClient(encryptedKey: string, iv: string): Promise<Anthropic> {
  const apiKey = decrypt(encryptedKey, iv);
  return new Anthropic({ apiKey });
}

export async function searchJobs(
  client: Anthropic,
  model: string,
  preferences: JobPreferences,
  resumeContent: string
): Promise<DiscoveredJob[]> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: buildJobSearchPrompt(preferences, resumeContent),
      },
    ],
  });

  return parseJobSearchResponse(response);
}

function buildJobSearchPrompt(prefs: JobPreferences, resume: string): string {
  return `You are an expert job search assistant. Search the web for recently posted jobs matching these criteria:

CANDIDATE PROFILE:
${resume}

SEARCH CRITERIA:
- Job titles: ${prefs.targetTitles.join(", ")}
- Locations: ${prefs.targetLocations.join(", ")}
- Remote preference: ${prefs.remotePreference}
- Experience level: ${prefs.experienceLevel}
- Industries: ${prefs.industries.join(", ")}
- Additional keywords: ${prefs.keywords.join(", ")}
${prefs.salaryMin ? `- Minimum salary: $${prefs.salaryMin}` : ""}
${prefs.excludeCompanies.length ? `- EXCLUDE these companies: ${prefs.excludeCompanies.join(", ")}` : ""}

INSTRUCTIONS:
1. Search for jobs posted within the last 48 hours matching these criteria
2. Search across job boards (Indeed, LinkedIn, Glassdoor, Wellfound) AND company career pages
3. For each job found, extract: title, company, location, URL, salary if listed, posted date
4. Search for at least 3-5 different query variations to maximize coverage
5. Return results as a JSON array

Return ONLY a JSON array of jobs found:
[{"title": "...", "company": "...", "location": "...", "url": "...", "source": "...", "salaryRange": "...", "postedDate": "...", "description": "..."}]`;
}
```

---

## 10. Implementation Phases with Verification Gates

**IMPORTANT RULES FOR CLAUDE CODE:**

- Execute phases in order A → J. Never skip ahead.
- After completing each phase, run its Verification Gate.
- If any Verification Gate check fails, fix the issue BEFORE proceeding.
- Update `PROGRESS.md` after completing each phase and its gate.
- If a phase requires an external service not yet configured, check the Infrastructure Setup Manifest first.

---

### Phase A — Foundation (Est: 2-3 hours)

**Tasks:**

1. Initialize monorepo with pnpm workspaces (web + worker + packages/shared)
2. Create Next.js 14 app in `web/` with TypeScript, Tailwind, ESLint, App Router, src directory
3. Install ALL dependencies listed in Infrastructure Manifest Step 1
4. Initialize shadcn/ui with all required components
5. Create `docker-compose.yml` with Postgres 16 + Redis 7
6. Configure TypeScript strict mode in all packages
7. Set up ESLint flat config + Prettier
8. Create all directories matching Project Structure (Section 4)
9. Create `.env.example` with ALL environment variables from Section 3
10. Create `lib/errors.ts` with all custom error classes from Section 9
11. Create `lib/logger.ts` with structured JSON logging
12. Create `lib/utils.ts` with `cn()` helper from shadcn/ui
13. Create `lib/constants.ts` with app-wide constants
14. Create `packages/shared/src/encryption.ts` with AES-256-GCM encrypt/decrypt
15. Create `scripts/setup.sh` that runs docker compose up, installs deps, copies env
16. Create `PROGRESS.md` from template below

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE A: Foundation
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] TypeScript compiles with zero errors (web)   │
  │ [ ] TypeScript compiles with zero errors (worker)│
  │ [ ] TypeScript compiles with zero errors (shared)│
  │ [ ] ESLint passes with zero warnings             │
  │ [ ] Prettier check passes                        │
  │ [ ] Encryption encrypt/decrypt roundtrip test    │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] `docker compose up -d` starts Postgres+Redis│
  │ [ ] `cd web && pnpm dev` starts at localhost:3000│
  │ [ ] All directories from Section 4 exist         │
  │ [ ] .env.example contains ALL variables          │
  │ [ ] Project structure matches spec exactly       │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] .env.local is in .gitignore                  │
  │ [ ] No secrets in source code                    │
  │ [ ] .env.example has no real values              │
  └─────────────────────────────────────────────────┘

  DOCUMENTATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] README.md has setup instructions             │
  │ [ ] .env.example is complete and commented       │
  │ [ ] PROGRESS.md created from template            │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase A ✅
  ⛔ DO NOT PROCEED TO PHASE B UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase B — Database & Schema (Est: 2-3 hours)

**Tasks:**

1. Initialize Prisma in `web/prisma/` with PostgreSQL provider
2. Copy COMPLETE schema from Section 5 into `schema.prisma`
3. Run `pnpm prisma migrate dev --name init` to create initial migration
4. Create `prisma/seed.ts` with realistic development seed data:
   - 1 admin user (email from ADMIN_EMAIL env var)
   - 2 regular users with complete profiles
   - 5 resumes (1 master per user)
   - 15 jobs with varying match scores (some with contacts)
   - 5 applications in different statuses
   - 3 search runs
5. Configure `package.json` prisma seed command
6. Run seed and verify data
7. Create `src/server/db.ts` — Prisma client singleton with connection pooling
8. Create `docs/DATABASE.md` documenting all tables, relationships, and indexes
9. Share Prisma client with worker via workspace dependency

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE B: Database & Schema
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Migrations run from scratch (prisma migrate  │
  │     reset --force) without errors                │
  │ [ ] Seed script completes without errors         │
  │ [ ] All 16 tables created                        │
  │ [ ] All indexes exist (check via psql)           │
  │ [ ] All unique constraints work (test duplicate) │
  │ [ ] Cascade deletes work (delete user → all data)│
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Can query each table and see seeded data     │
  │ [ ] Foreign key joins return expected data       │
  │ [ ] Unique constraint on (userId, url) in jobs   │
  │     prevents duplicate jobs for same user        │
  │ [ ] Enum values stored correctly                 │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] No raw SQL with string interpolation         │
  │ [ ] Connection uses SSL in production config     │
  │ [ ] Database user has minimum required perms     │
  └─────────────────────────────────────────────────┘

  PERFORMANCE BASELINE:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Seed 100 jobs → list query < 50ms            │
  │ [ ] Filter by status + userId < 50ms             │
  └─────────────────────────────────────────────────┘

  DOCUMENTATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] docs/DATABASE.md documents all 16 tables     │
  │ [ ] Schema file has comments on every table      │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase B ✅
  ⛔ DO NOT PROCEED TO PHASE C UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase C — Authentication & API Layer (Est: 3-4 hours)

**Tasks:**

1. Configure Better Auth in `src/server/auth.ts` — exact config from Section 7
2. Create auth API route handler at `src/app/api/auth/[...all]/route.ts`
3. Create auth middleware for tRPC context (session extraction)
4. Set up tRPC:
   - `src/server/trpc/init.ts` — tRPC initialization, context creation with session + prisma
   - Define `publicProcedure`, `protectedProcedure`, `onboardedProcedure`, `adminProcedure`
   - `src/server/trpc/router.ts` — root router merging all sub-routers
   - `src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler
   - `src/lib/trpc-client.ts` — React Query + tRPC client setup
5. Create `user.ts` router with getProfile, updateProfile, deleteAccount
6. Create `settings.ts` router with getApiConfig, setApiKey, validateApiKey, updateApiConfig, getPreferences, updatePreferences
7. Implement encryption service for API key storage
8. Create all Zod validation schemas in `lib/validations.ts`
9. Implement rate limiting middleware (using Redis)
10. Add security headers in `next.config.js`
11. Create auth pages: `/login`, `/register` with forms
12. Create TRPCProvider wrapper in root layout
13. Create auth guard middleware in `middleware.ts` (redirect unauthenticated users)

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE C: Auth & API Layer
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Register with email/password creates user    │
  │ [ ] Login with correct credentials returns session│
  │ [ ] Login with wrong password returns 401        │
  │ [ ] Protected route returns 401 without session  │
  │ [ ] Admin route returns 403 for non-admin user   │
  │ [ ] API key encrypt → store → decrypt roundtrip  │
  │ [ ] Zod validation rejects invalid inputs        │
  │ [ ] Rate limiter blocks after threshold          │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Register page renders, creates user          │
  │ [ ] Login page renders, sets session cookie      │
  │ [ ] Google OAuth redirects correctly             │
  │ [ ] Authenticated user can access /dashboard     │
  │ [ ] Unauthenticated user redirected to /login    │
  │ [ ] tRPC endpoint returns typed data             │
  │ [ ] API key stored encrypted in DB (verify raw)  │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Passwords hashed with bcrypt (cost ≥ 12)     │
  │ [ ] Session cookie: HttpOnly, Secure, SameSite   │
  │ [ ] Auth errors don't leak user existence        │
  │ [ ] Security headers present in response         │
  │ [ ] CSRF protection active                       │
  │ [ ] API key never returned in any API response   │
  │ [ ] Rate limiting on /auth/* endpoints           │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase C ✅
  ⛔ DO NOT PROCEED TO PHASE D UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase D — Onboarding Flow (Est: 3-4 hours)

**Tasks:**

1. Create multi-step onboarding wizard at `/onboarding/page.tsx`
2. Create Zustand store for onboarding state (`stores/onboarding-store.ts`)
3. Build Step 1: Master Resume Upload
   - Upload PDF/DOCX → parse text (server-side)
   - OR paste resume text directly
   - OR fill structured form (contact info, experience, education, skills, projects)
   - Save as master resume
4. Build Step 2: Job Preferences
   - Multi-select for job titles (with suggestions)
   - Location input with autocomplete
   - Remote preference toggle (Remote / Hybrid / On-site / Any)
   - Salary range slider
   - Company size checkboxes
   - Industry multi-select
   - Experience level select
5. Build Step 3: Claude API Key Configuration
   - API key input (masked, with paste support)
   - "Validate Key" button → calls Claude API to verify
   - Model selection (Research: Opus/Sonnet, Execution: Sonnet/Haiku)
   - Search depth selector with cost estimates
   - Daily search time picker
   - Max daily API cost limit
6. Build Step 4: Gmail Connection (Optional)
   - "Connect Gmail" button → OAuth flow
   - Show connected email on success
   - "Skip for now" option
7. Build Step 5: Review
   - Summary of all settings
   - Edit buttons linking back to each step
   - "Complete Setup" → marks onboardingComplete = true → redirect to /dashboard
8. Progress indicator (stepper) showing current step
9. Mobile-responsive layout for all steps

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE D: Onboarding Flow
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Resume creation via structured form works    │
  │ [ ] Resume text paste creates resume record      │
  │ [ ] Preferences save all fields correctly        │
  │ [ ] API key validation catches invalid keys      │
  │ [ ] API key stored encrypted (not plaintext)     │
  │ [ ] Onboarding completion updates user flag      │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Complete full onboarding flow end-to-end     │
  │ [ ] Navigate back and forth between steps        │
  │ [ ] Data persists when navigating between steps  │
  │ [ ] Skip Gmail works, lands on dashboard         │
  │ [ ] Mobile layout renders all steps correctly    │
  │ [ ] Review page shows all entered data           │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] API key masked in UI (show last 4 chars)     │
  │ [ ] API key encrypted before DB storage          │
  │ [ ] Gmail OAuth uses read-only scope only        │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase D ✅
  ⛔ DO NOT PROCEED TO PHASE E UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase E — Dashboard & Job Listings (Est: 4-5 hours)

**Tasks:**

1. Build dashboard layout shell (`(dashboard)/layout.tsx`):
   - Sidebar with nav: Dashboard, Jobs, Applications, Resume, Outreach, Settings
   - Collapsible sidebar on desktop, bottom nav on mobile
   - Header with user avatar dropdown (profile, settings, logout)
   - Notification bell (placeholder for future)
2. Build Dashboard Overview page:
   - Stats cards: total jobs found, applications in progress, interviews scheduled, match score average
   - Recent high-match jobs (top 5, >80%)
   - Application status summary (mini kanban preview)
   - Last search run status + next scheduled
   - Quick action buttons: "Search Now", "View All Jobs"
3. Build Job Listings page (`/jobs`):
   - Filter sidebar: status, match score range, location, company, date range
   - Sort: match score (desc), discovered date (desc/asc), company (alpha)
   - Search bar for text search across title + company
   - Job cards showing: title, company, location, match %, posted date, status badge
   - Infinite scroll pagination
   - Bulk actions: archive, bookmark
4. Build Job Detail page (`/jobs/[id]`):
   - Full job description (rendered from text)
   - Match analysis section: overall score (circular gauge), breakdown by category
   - Missing keywords section with pill badges
   - Resume improvement suggestions
   - Company intel section (populated for 80%+ matches):
     - Company overview
     - Key contacts with titles, emails, LinkedIn links
     - Alumni connections highlighted
     - Outreach recommendation with priority order
   - Action buttons: Apply (link to external), Track Application, Tailor Resume, Generate Outreach
5. Build `match-score.tsx` component — circular progress gauge with color coding:
   - 0-40%: red, 40-60%: amber, 60-80%: blue, 80-100%: green
6. Build `company-intel.tsx` component — contact cards with outreach buttons
7. Implement the `job.ts` tRPC router (all endpoints from Section 6.4)

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE E: Dashboard & Jobs
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Job list query returns paginated results     │
  │ [ ] Filters narrow results correctly             │
  │ [ ] Sort by matchScore descending works          │
  │ [ ] Job detail returns full data with contacts   │
  │ [ ] Status update persists                       │
  │ [ ] User can only see their own jobs             │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Dashboard renders with seed data             │
  │ [ ] Stats cards show correct counts              │
  │ [ ] Job list loads with seed data                │
  │ [ ] Filters and sort work in UI                  │
  │ [ ] Job detail page renders all sections         │
  │ [ ] Match score gauge displays correctly         │
  │ [ ] Sidebar navigation works on all pages        │
  │ [ ] Mobile responsive on all pages               │
  │ [ ] Loading skeletons appear during data fetch   │
  │ [ ] Empty states show when no data               │
  └─────────────────────────────────────────────────┘

  PERFORMANCE BASELINE:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Job list page loads in < 1s with 100 jobs    │
  │ [ ] Job detail page loads in < 500ms             │
  │ [ ] Dashboard loads in < 1s                      │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase E ✅
  ⛔ DO NOT PROCEED TO PHASE F UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase F — Resume Editor & PDF Generation (Est: 4-5 hours)

**Tasks:**

1. Build Resume List page (`/resume`):
   - Card grid showing all resumes
   - Master resume badge
   - "Create New Resume" button
   - Last modified date, format indicator
2. Build Resume Editor page (`/resume/[id]`):
   - Tab toggle: Structured Form | Rich Text Editor
   - **Structured Form mode:**
     - Contact info section
     - Professional summary textarea
     - Experience section (add/remove/reorder entries, each with company, title, dates, bullets)
     - Education section (similar structure)
     - Skills section (categorized: technical, frameworks, tools, languages)
     - Projects section
     - Certifications section
     - Custom sections
   - **Rich Text Editor mode (TipTap):**
     - Full toolbar: bold, italic, underline, headings (H1-H3), bullet list, numbered list, link
     - Drag-and-drop section reordering
     - Spell check
     - Auto-save (debounced 2s after last keystroke)
   - **Split pane** on desktop: editor left, live PDF preview right
   - "Generate PDF" button
   - Version history (show version number, updatedAt)
3. Set up TipTap with required extensions:
   - StarterKit, Placeholder, Underline, Link, TextAlign, Heading
4. Build PDF generation with @react-pdf/renderer:
   - Professional resume template (clean, ATS-friendly)
   - Renders from structured data OR rich text content
   - Upload generated PDF to Cloudflare R2
   - Return download URL
5. Build Resume tailor flow:
   - From job detail page → "Tailor Resume" → creates copy of master resume
   - Shows missing keywords as pills → click to add to resume
   - Shows suggestions inline
   - Save as TailoredResume linked to job
6. Implement `resume.ts` tRPC router (all endpoints from Section 6.3)
7. Set up R2 client (`src/server/services/r2.ts`)

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE F: Resume Editor
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Resume CRUD operations work                  │
  │ [ ] Structured form saves all sections correctly │
  │ [ ] Rich text content persists (TipTap JSON)     │
  │ [ ] PDF generation produces valid PDF            │
  │ [ ] PDF uploads to R2 successfully               │
  │ [ ] Tailored resume creates linked copy          │
  │ [ ] Cannot delete master resume                  │
  │ [ ] Set master resume unsets previous master     │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Structured form: add/edit/remove all sections│
  │ [ ] Rich text editor: all toolbar features work  │
  │ [ ] Tab toggle preserves content                 │
  │ [ ] Auto-save works (check network tab)          │
  │ [ ] PDF preview renders correctly                │
  │ [ ] PDF download produces clean, ATS-friendly doc│
  │ [ ] Tailor resume flow from job detail works     │
  │ [ ] Keyword suggestions appear and can be added  │
  │ [ ] Mobile: form renders correctly               │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase F ✅
  ⛔ DO NOT PROCEED TO PHASE G UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase G — Application Tracker (Est: 3-4 hours)

**Tasks:**

1. Build Kanban Board page (`/applications`):
   - Columns: Applied, Phone Screen, Interview, Offer, Rejected
   - Drag-and-drop between columns (use @dnd-kit/core)
   - Application cards showing: company, title, match %, applied date, last update
   - Click card → expand with full details, notes, timeline
2. Build Application Status Timeline component:
   - Vertical timeline showing all status changes with dates
   - Source indicator (manual, email scan, auto-detected)
3. Build "Track Application" flow:
   - From job detail → "I Applied" button
   - Quick form: applied via (dropdown), date, notes
   - Creates Application record, updates job status
4. Build application detail expansion:
   - Notes editor
   - Interview date picker
   - Link to tailored resume used
   - Link to original job posting
5. Implement `application.ts` tRPC router (all endpoints from Section 6.5)
6. Install and configure @dnd-kit for drag-and-drop
7. Zustand store for kanban drag state

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE G: Application Tracker
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Create application from job                  │
  │ [ ] Update status appends to statusHistory       │
  │ [ ] Kanban data groups correctly by status       │
  │ [ ] Application cannot be created for same job 2x│
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Kanban board renders all columns             │
  │ [ ] Drag-and-drop moves card between columns     │
  │ [ ] Card expansion shows full details            │
  │ [ ] Status timeline renders correctly            │
  │ [ ] "I Applied" flow creates application         │
  │ [ ] Notes save and persist                       │
  │ [ ] Mobile: stacked column view works            │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase G ✅
  ⛔ DO NOT PROCEED TO PHASE H UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase H — Worker Service & AI Engine (Est: 5-6 hours)

**This is the core engine. Take extra care.**

**Tasks:**

1. Set up worker entry point (`worker/src/index.ts`):
   - Initialize Redis connection
   - Initialize Prisma client
   - Register all queue processors
   - Start cron scheduler
   - Graceful shutdown handler (SIGTERM, SIGINT)
2. Create Redis connection manager (`worker/src/lib/redis.ts`)
3. Build Claude API service (`worker/src/services/claude.ts`):
   - `createClaudeClient(encryptedKey, iv)` — decrypt key, instantiate client
   - `searchJobs(client, model, prefs, resume)` — web search for jobs
   - `analyzeMatch(client, model, jobDescription, resume)` — match scoring
   - `researchCompany(client, model, company, school)` — company intelligence
   - `classifyEmail(client, model, emailContent)` — email status detection
   - All functions include proper error handling, timeout (30s per API call), and cost tracking
4. Build job search processor (`processors/job-search.processor.ts`):
   - Full implementation as described in Section 9 Background Jobs
   - Dedup logic (check existing URLs)
   - SearchRun tracking (start, progress, complete/fail)
   - Cost estimation per API call
5. Build match analysis processor (`processors/match-analysis.processor.ts`):
   - Structured prompt for Claude → parse JSON response
   - Score calculation: 40% skills match + 30% title match + 20% experience match + 10% other
   - Extract missing keywords + suggestions
6. Build company intel processor (`processors/company-intel.processor.ts`):
   - Multi-step research: company info → executives → HR → alumni
   - Hunter.io integration for email discovery
   - Contact priority scoring (alumni > HR > hiring manager > executive)
   - Outreach draft generation (email + LinkedIn <200 chars)
7. Build email scan processor (`processors/email-scan.processor.ts`):
   - Gmail API query construction
   - Claude-based email classification
   - Job matching by company name
   - Auto-update application status
8. Build cron scheduler (`worker/src/cron/scheduler.ts`):
   - Register all cron jobs from Section 9 table
   - `daily-search-enqueue`: check user search times vs current hour, enqueue matching
   - `email-scan-enqueue`: enqueue for all users with active Gmail connections
9. Build Gmail service (`worker/src/services/gmail.ts`):
   - Token refresh logic
   - Message search with query builder
   - Message content extraction
10. Build Hunter.io service (`worker/src/services/hunter.ts`):
    - Domain search → email pattern
    - Email finder → specific person
    - Rate limit tracking (25/month free tier)
11. Create worker Dockerfile for Railway deployment
12. Create `worker/package.json` scripts: `dev`, `start`, `build`

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE H: Worker & AI Engine
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Claude client creation with encrypted key    │
  │ [ ] Job search prompt generation                 │
  │ [ ] Match analysis JSON parsing                  │
  │ [ ] Email classification prompt + parsing        │
  │ [ ] Dedup logic prevents duplicate jobs          │
  │ [ ] Cost estimation calculation                  │
  │ [ ] Search run status tracking (queue→run→done)  │
  │ [ ] Cron scheduler registers all jobs            │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Worker starts and connects to Redis + DB     │
  │ [ ] Trigger manual search → jobs appear in DB    │
  │ [ ] Match analysis populates scores + keywords   │
  │ [ ] Company intel populates contacts (80%+ jobs) │
  │ [ ] Email scan reads Gmail messages correctly    │
  │ [ ] Email classification detects rejection/offer │
  │ [ ] Failed jobs retry correctly                  │
  │ [ ] Worker logs structured JSON to stdout        │
  │ [ ] Graceful shutdown completes active jobs      │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] API keys decrypted only in memory, never log │
  │ [ ] Gmail tokens refreshed before expiry         │
  │ [ ] Hunter.io respects rate limits               │
  │ [ ] Claude API errors don't leak user data       │
  └─────────────────────────────────────────────────┘

  PERFORMANCE BASELINE:
  ┌─────────────────────────────────────────────────┐
  │ [ ] LIGHT search completes in < 2 minutes        │
  │ [ ] STANDARD search completes in < 5 minutes     │
  │ [ ] Email scan completes in < 1 minute           │
  │ [ ] Match analysis per job < 30 seconds          │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase H ✅
  ⛔ DO NOT PROCEED TO PHASE I UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase I — Admin Panel, Settings & Polish (Est: 3-4 hours)

**Tasks:**

1. Build Admin Dashboard (`/admin`):
   - Stats: total users, active users (7d), total jobs found, total applications
   - Chart: new users per day (last 30 days) — use recharts
   - Chart: searches per day (last 30 days)
   - System health indicators (DB, Redis, Worker status)
   - Recent signups list
2. Build Admin Users page (`/admin/users`):
   - Paginated user table with search
   - Columns: email, name, role, jobs found, applications, last search, joined date
   - Click → user detail with full activity
3. Build Admin System page (`/admin/system`):
   - BullMQ queue stats (waiting, active, completed, failed per queue)
   - Error log viewer (recent failed jobs)
   - Redis memory usage
4. Build Settings page (`/settings`):
   - Sections: Profile, API Configuration, Job Preferences, Gmail Connection, Account
   - Each section independently editable
   - API key: masked display, change button, validate button
   - Preferences: same form as onboarding but inline
   - Gmail: connection status, reconnect/disconnect buttons
   - Account: change password, delete account with confirmation
5. Implement `admin.ts` tRPC router (all endpoints from Section 6.8)
6. Build Outreach page (`/outreach`):
   - List all contacts across all jobs
   - Filter by outreach status (draft, sent, replied)
   - Group by job
   - Edit draft inline
   - Copy to clipboard button
7. Polish all existing pages:
   - Add toast notifications for all mutations (success/error)
   - Add confirmation dialogs for destructive actions
   - Ensure all error boundaries are in place
   - Ensure all empty states have illustrations
   - Fix any responsive issues
8. Add landing page (`/`):
   - Hero section explaining JobPilot
   - Feature highlights (3-4 cards)
   - How it works (3 steps)
   - CTA: "Get Started" → /register

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE I: Admin, Settings & Polish
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Admin endpoints return 403 for non-admin     │
  │ [ ] Admin dashboard returns correct stats        │
  │ [ ] Settings update all fields correctly         │
  │ [ ] Password change works                        │
  │ [ ] Account deletion cascades all data           │
  └─────────────────────────────────────────────────┘

  MANUAL VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Admin dashboard renders with real data       │
  │ [ ] Admin users table paginates and searches     │
  │ [ ] Admin system page shows queue stats          │
  │ [ ] Settings page: all sections editable         │
  │ [ ] Outreach page lists contacts and drafts      │
  │ [ ] Copy draft to clipboard works                │
  │ [ ] Toast notifications on all mutations         │
  │ [ ] Confirm dialogs on destructive actions       │
  │ [ ] Landing page renders and links work          │
  │ [ ] All pages responsive on mobile               │
  │ [ ] No console errors or warnings on any page    │
  └─────────────────────────────────────────────────┘

  ACCESSIBILITY:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Keyboard navigation works on all pages       │
  │ [ ] Screen reader can navigate dashboard         │
  │ [ ] Color contrast passes WCAG AA                │
  │ [ ] Focus rings visible on all interactive elem  │
  └─────────────────────────────────────────────────┘

  → Update PROGRESS.md: Phase I ✅
  ⛔ DO NOT PROCEED TO PHASE J UNTIL ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

### Phase J — Testing, Deployment & Launch (Est: 4-5 hours)

**Tasks:**

1. Write unit tests (Vitest):
   - Encryption service (encrypt/decrypt roundtrip, invalid key handling)
   - Zod validation schemas (valid + invalid inputs)
   - Match score calculation
   - Email classification parsing
   - tRPC router unit tests for critical paths
   - Target: 80% coverage on business logic
2. Write integration tests:
   - Auth flow: register → login → access protected → logout
   - Resume CRUD with database
   - Job creation + dedup
   - Application tracking with status history
3. Write E2E tests (Playwright):
   - Test 1: Full registration → onboarding → dashboard flow
   - Test 2: View job listings → open job detail → create application
   - Test 3: Resume editor → modify → generate PDF
   - Test 4: Settings → update preferences → verify saved
   - Test 5: Admin → view dashboard → view users
4. Set up CI/CD:
   - GitHub Actions workflow (`ci.yml`):
     - Trigger: push to main, PR to main
     - Steps: checkout → install → lint → type check → unit tests → build
     - Uses: Docker services for Postgres + Redis in test
   - Vercel deployment:
     - Auto-deploy on push to main
     - Preview deploys on PRs
   - Railway deployment (`deploy-worker.yml`):
     - Auto-deploy worker on push to main
     - Health check endpoint
5. Deploy to production:
   - Vercel: connect GitHub repo, set all env vars
   - Railway: deploy worker service, set all env vars
   - Railway: verify Postgres + Redis provisioned
   - Configure custom domain (when ready)
   - Verify SSL certificate
6. Post-deploy verification:
   - Health check endpoints respond
   - Auth flow works in production
   - Worker cron jobs running
   - Sentry receiving errors
   - BetterStack monitoring active
7. Create all documentation:
   - `docs/ARCHITECTURE.md` — system design decisions
   - `docs/API.md` — tRPC router documentation
   - `docs/DEPLOYMENT.md` — deploy guide + incident response
   - Update `README.md` with complete setup instructions

```
═══════════════════════════════════════════════════════════
  VERIFICATION GATE — PHASE J: Testing & Deployment
═══════════════════════════════════════════════════════════

  AUTOMATED TESTS:
  ┌─────────────────────────────────────────────────┐
  │ [ ] All unit tests pass (vitest)                 │
  │ [ ] All integration tests pass                   │
  │ [ ] All E2E tests pass (playwright)              │
  │ [ ] CI pipeline passes on GitHub Actions         │
  │ [ ] Coverage meets 80% on business logic         │
  │ [ ] No flaky tests                               │
  └─────────────────────────────────────────────────┘

  PRODUCTION VERIFICATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Vercel deployment accessible                 │
  │ [ ] Railway worker running                       │
  │ [ ] Postgres connected in production             │
  │ [ ] Redis connected in production                │
  │ [ ] Register → Login → Dashboard flow works      │
  │ [ ] Onboarding flow works end-to-end             │
  │ [ ] Manual search trigger → jobs appear          │
  │ [ ] Gmail OAuth flow works                       │
  │ [ ] Admin panel accessible to admin user         │
  │ [ ] Worker cron jobs executing on schedule       │
  └─────────────────────────────────────────────────┘

  SECURITY CHECKPOINT:
  ┌─────────────────────────────────────────────────┐
  │ [ ] HTTPS enforced                               │
  │ [ ] Security headers present                     │
  │ [ ] No secrets in code or git history            │
  │ [ ] All env vars set in production               │
  │ [ ] Rate limiting active                         │
  │ [ ] 0 critical vulnerabilities (pnpm audit)      │
  └─────────────────────────────────────────────────┘

  PERFORMANCE:
  ┌─────────────────────────────────────────────────┐
  │ [ ] Lighthouse Performance ≥ 90                  │
  │ [ ] Lighthouse Accessibility ≥ 90                │
  │ [ ] API response times < 200ms                   │
  │ [ ] Bundle size < 300KB (first load)             │
  └─────────────────────────────────────────────────┘

  DOCUMENTATION:
  ┌─────────────────────────────────────────────────┐
  │ [ ] README.md: complete setup instructions       │
  │ [ ] ARCHITECTURE.md: design decisions            │
  │ [ ] API.md: endpoint reference                   │
  │ [ ] DATABASE.md: schema docs                     │
  │ [ ] DEPLOYMENT.md: deploy + incident response    │
  │ [ ] PROGRESS.md: shows 100% complete             │
  └─────────────────────────────────────────────────┘

  ⛔ LAUNCH ONLY WHEN ALL CHECKS PASS
═══════════════════════════════════════════════════════════
```

---

## 11. Progress Tracker Template

Create this as `PROGRESS.md` in Phase A. Update after every completed phase.

```
╔══════════════════════════════════════════════════════════╗
║          PROJECT PROGRESS TRACKER — JobPilot             ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  INFRASTRUCTURE SETUP              [░░░░░░░░░░]   0%    ║
║  ⬜ Docker (Postgres + Redis)                            ║
║  ⬜ Railway (Production DB + Redis)                      ║
║  ⬜ Cloudflare R2 (File storage)                         ║
║  ⬜ Google OAuth + Gmail API                             ║
║  ⬜ Hunter.io API                                        ║
║  ⬜ Sentry Error Tracking                                ║
║  ⬜ Environment variables complete                       ║
║                                                          ║
║  PHASE A: Foundation               [░░░░░░░░░░]   0%    ║
║  ⬜ Monorepo setup                                       ║
║  ⬜ All dependencies installed                           ║
║  ⬜ Project structure created                            ║
║  ⬜ Core utilities (errors, logger, encryption)          ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE B: Database & Schema        [░░░░░░░░░░]   0%    ║
║  ⬜ Prisma schema (16 tables)                            ║
║  ⬜ Migrations applied                                   ║
║  ⬜ Seed data created                                    ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE C: Auth & API Layer         [░░░░░░░░░░]   0%    ║
║  ⬜ Better Auth configured                               ║
║  ⬜ tRPC setup with all procedures                       ║
║  ⬜ Login/Register pages                                 ║
║  ⬜ Rate limiting                                        ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE D: Onboarding Flow          [░░░░░░░░░░]   0%    ║
║  ⬜ Multi-step wizard                                    ║
║  ⬜ Resume upload/form                                   ║
║  ⬜ Preferences form                                     ║
║  ⬜ API key configuration                                ║
║  ⬜ Gmail OAuth                                          ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE E: Dashboard & Jobs         [░░░░░░░░░░]   0%    ║
║  ⬜ Dashboard layout + shell                             ║
║  ⬜ Dashboard overview page                              ║
║  ⬜ Job listings with filters                            ║
║  ⬜ Job detail page                                      ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE F: Resume Editor            [░░░░░░░░░░]   0%    ║
║  ⬜ Structured form editor                               ║
║  ⬜ TipTap rich text editor                              ║
║  ⬜ PDF generation + R2 upload                           ║
║  ⬜ Resume tailoring flow                                ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE G: Application Tracker      [░░░░░░░░░░]   0%    ║
║  ⬜ Kanban board with drag-and-drop                      ║
║  ⬜ Application CRUD                                     ║
║  ⬜ Status timeline                                      ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE H: Worker & AI Engine       [░░░░░░░░░░]   0%    ║
║  ⬜ Worker service setup                                 ║
║  ⬜ Job search processor (Claude + web search)           ║
║  ⬜ Match analysis processor                             ║
║  ⬜ Company intel processor                              ║
║  ⬜ Email scan processor                                 ║
║  ⬜ Cron scheduler                                       ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE I: Admin, Settings & Polish [░░░░░░░░░░]   0%    ║
║  ⬜ Admin dashboard                                      ║
║  ⬜ Settings page                                        ║
║  ⬜ Outreach page                                        ║
║  ⬜ Landing page                                         ║
║  ⬜ Toast + confirmations                                ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
║  PHASE J: Testing & Deployment     [░░░░░░░░░░]   0%    ║
║  ⬜ Unit tests (80% coverage)                            ║
║  ⬜ Integration tests                                    ║
║  ⬜ E2E tests (5 critical paths)                         ║
║  ⬜ CI/CD pipeline                                       ║
║  ⬜ Production deployment                                ║
║  ⬜ Documentation complete                               ║
║  ⬜ Verification Gate passed                             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 12. Pre-Launch Checklist

```
═══════════════════════════════════════════════════════════
  PRE-LAUNCH CHECKLIST — JobPilot
═══════════════════════════════════════════════════════════

  DATA & API
  [ ] All tRPC routers handle errors consistently
  [ ] All inputs validated with Zod
  [ ] Pagination on all list endpoints
  [ ] Consistent error response format
  [ ] API key never returned in any response

  AUTHENTICATION & SECURITY
  [ ] Passwords hashed (bcrypt ≥12)
  [ ] No secrets in code or git history
  [ ] HTTPS enforced everywhere
  [ ] Security headers: HSTS, CSP, X-Frame, X-Content-Type
  [ ] Rate limiting on auth endpoints
  [ ] CSRF protection active
  [ ] SQL injection: all queries parameterized (Prisma)
  [ ] XSS: all output encoded, CSP active
  [ ] Auth errors don't leak user existence
  [ ] Session expiry and refresh working
  [ ] Dependency audit: 0 critical vulnerabilities
  [ ] File uploads validated (type, size)
  [ ] API keys encrypted at rest (AES-256-GCM)
  [ ] Gmail tokens encrypted at rest
  [ ] No sensitive data in logs

  FRONTEND
  [ ] All routes render without errors
  [ ] Auth-protected routes redirect properly
  [ ] Loading states on all data-fetching components
  [ ] Error states on all data-fetching components
  [ ] Empty states on all list pages
  [ ] Forms validate input and show errors
  [ ] Responsive on mobile, tablet, desktop
  [ ] Accessibility: keyboard nav, screen reader, contrast
  [ ] Lighthouse Performance ≥ 90
  [ ] Lighthouse Accessibility ≥ 90
  [ ] No console errors or warnings
  [ ] Bundle size < 300KB first load

  BACKEND
  [ ] Structured logging active
  [ ] Custom error classes used throughout
  [ ] External calls have timeouts + retries
  [ ] Background jobs have retry + dead letter handling
  [ ] Scheduled tasks running on schedule
  [ ] Health endpoint checks all dependencies

  TESTING
  [ ] All unit tests pass
  [ ] All integration tests pass
  [ ] All E2E tests pass (5 critical paths)
  [ ] CI runs tests on every push
  [ ] Coverage meets 80% on business logic

  INFRASTRUCTURE
  [ ] Production deployed and accessible
  [ ] SSL certificate valid
  [ ] Automated backups (Railway managed)
  [ ] Monitoring active (Sentry + BetterStack)
  [ ] Worker service running with cron
  [ ] Graceful shutdown on deploy

  DOCUMENTATION
  [ ] README.md: setup, test, deploy instructions
  [ ] ARCHITECTURE.md: design decisions
  [ ] API.md: endpoint reference
  [ ] DATABASE.md: schema docs
  [ ] DEPLOYMENT.md: deploy + incident response
  [ ] PROGRESS.md: shows 100% complete
  [ ] .env.example: complete and accurate

═══════════════════════════════════════════════════════════
```
