# Architecture — JobPilot

## System Overview

JobPilot is a multi-tenant SaaS with two deployable units:

1. **`web/`** — Next.js 14 App Router frontend + API (Vercel)
2. **`worker/`** — BullMQ background job processor (Railway)

Both share `packages/shared/` (encryption utilities and shared types) via pnpm workspaces.

---

## Data Flow

```
User Browser
  │
  ├─ tRPC (HTTPS) → Next.js API Routes
  │                   │
  │                   ├─ Better Auth (sessions)
  │                   ├─ Prisma (PostgreSQL reads/writes)
  │                   └─ BullMQ Queue (enqueue jobs)
  │
  └─ Static assets → Vercel CDN

BullMQ Queues (Redis)
  │
  └─ Worker Service
       ├─ job-search processor → Claude API → PostgreSQL
       ├─ match-analysis processor → Claude API → PostgreSQL
       ├─ company-intel processor → Claude API + Hunter.io → PostgreSQL
       ├─ email-scan processor → Gmail API + Claude API → PostgreSQL
       └─ Cron scheduler (setInterval) → enqueues above jobs
```

---

## Key Design Decisions

### Users Own Their AI Keys

Each user provides their own Anthropic Claude API key. This is encrypted with AES-256-GCM (user-specific per their stored key) and stored in `user_api_configs`. The worker decrypts it only in memory at job execution time. This means:
- No API cost markup for the platform
- Users control their own spend limits
- Platform bears zero AI cost

### tRPC for End-to-End Type Safety

All API communication uses tRPC v11. Types flow from Prisma → tRPC router → React Query hooks with zero manual type definitions. This eliminates runtime type errors and removes the need for a separate API documentation step.

### BullMQ for Reliable Background Jobs

All AI operations run in the worker via BullMQ:
- **Retries** — exponential backoff prevents thundering herd on API failures
- **Concurrency limits** — job-search: 2 concurrent, match-analysis: 5, company-intel: 3
- **Rate limiting** — 5 searches per minute max across all workers
- **Job chaining** — match-analysis enqueues company-intel when score ≥ 80%

### AES-256-GCM Encryption

API keys and Gmail OAuth tokens are encrypted at rest in PostgreSQL using AES-256-GCM:
- Platform `ENCRYPTION_KEY` (env var) is the key material
- Each row stores its own random 16-byte IV
- Auth tag appended to ciphertext (format: `hex:authtag`)
- Implemented in `packages/shared/src/encryption.ts` — single source of truth

### No AI Costs for the Platform

The platform costs ~$7–17/month (Railway + Vercel free tier). Users pay Anthropic directly through their own API keys. Hunter.io uses its free tier (25 searches/month).

### Kanban + Status History

Application status is modeled as both:
- Current `status` field (enum) for fast kanban queries
- `statusHistory` JSON array for full audit trail with timestamps and sources (manual/email/auto)

---

## Database Schema Summary

16 tables across 4 domains:

| Domain | Tables |
|---|---|
| Auth | User, Session, Account, Verification |
| Config | UserApiConfig, JobPreferences, GmailConnection |
| Resume | Resume, TailoredResume |
| Jobs | Job, JobContact, OutreachDraft, SearchRun |
| Applications | Application |
| Email | EmailScan |

Key constraints:
- `jobs(userId, url)` — unique, prevents duplicate job URLs per user
- `applications(jobId)` — unique, one application per job
- `email_scans(userId, gmailMessageId)` — unique, prevents duplicate email scans

---

## Security Model

| Concern | Implementation |
|---|---|
| Authentication | Better Auth (email+password + Google OAuth), HTTP-only session cookie |
| Authorization | tRPC middleware: `protectedProcedure`, `adminProcedure`, per-row ownership checks |
| API key storage | AES-256-GCM, decrypted only in worker memory |
| Gmail tokens | AES-256-GCM, refreshed before expiry |
| SQL injection | Prisma parameterized queries only |
| XSS | Next.js escaping + strict CSP |
| CSRF | SameSite=Strict cookies + Better Auth CSRF |
| Rate limiting | Per-user Redis counters via tRPC middleware |

---

## Performance Characteristics

| Operation | Target | Strategy |
|---|---|---|
| Job list query | <50ms | Index on (userId, status), pagination |
| Job detail | <200ms | Single query with relations |
| Dashboard load | <500ms | Parallel Promise.all queries |
| LIGHT search | <2 min | 2-3 Claude API calls |
| STANDARD search | <5 min | 5-8 Claude API calls |
| Email scan | <1 min | 20 messages max, parallel classification |
| Match analysis | <30s | Single Claude API call with structured output |

---

## Cron Schedule

| Job | Frequency | Description |
|---|---|---|
| `enqueueDailySearches` | Every hour | Enqueue search for users whose `searchTime` matches current hour |
| `enqueueEmailScans` | Every hour | Enqueue email scan for all active Gmail connections |
| `cleanupStaleSearchRuns` | Every hour | Mark RUNNING runs older than 30min as FAILED |
