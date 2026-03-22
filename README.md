# JobPilot

AI-powered autonomous job search & application management platform.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + Redis)
- Git

## Quick Start

```bash
# 1. Clone and setup
git clone <repo-url>
cd jobpilot
bash scripts/setup.sh

# 2. Fill in environment variables
nano web/.env.local

# 3. Run database migrations
cd web && pnpm prisma db push && pnpm prisma db seed

# 4. Start development server
cd .. && pnpm dev
```

## Project Structure

```
jobpilot/
├── web/          # Next.js 14 frontend + API (tRPC)
├── worker/       # Background job processor (BullMQ)
├── packages/
│   └── shared/   # Shared utilities (encryption, types, constants)
├── docs/         # Architecture, API, and deployment docs
├── scripts/      # Dev tooling
└── docker-compose.yml  # Local Postgres + Redis
```

## Environment Variables

Copy `web/.env.example` to `web/.env.local` and fill in:

| Variable               | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string                          |
| `REDIS_URL`            | Redis connection string                               |
| `BETTER_AUTH_SECRET`   | Auth secret (generate with `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                            |
| `R2_ACCOUNT_ID`        | Cloudflare R2 account ID                              |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2 access key                              |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key                              |
| `HUNTER_API_KEY`       | Hunter.io API key                                     |
| `ENCRYPTION_KEY`       | AES-256 key (generate with `openssl rand -hex 32`)    |

## Development Commands

```bash
# From repo root
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type check (all packages)
pnpm format           # Format with Prettier

# Tests
cd web
pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Run unit tests in watch mode
pnpm test:coverage    # Run with coverage report
pnpm test:e2e         # Run E2E tests (Playwright) — requires running app

# Database
pnpm db:seed          # Seed development data
pnpm db:reset         # Reset DB and re-seed

# Worker (from worker/)
pnpm dev              # Start worker in dev mode (tsx watch)
pnpm build            # Compile TypeScript
pnpm start            # Start compiled worker
```

## Running Tests

### Unit Tests

```bash
cd web
ENCRYPTION_KEY=$(openssl rand -hex 32) pnpm test
```

### E2E Tests

```bash
# 1. Start the app
docker compose up -d
cd web && pnpm prisma migrate dev && pnpm db:seed
cd .. && pnpm dev &

# 2. Run Playwright
cd web
pnpm test:e2e
```

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **API:** tRPC v11, Zod validation
- **Database:** PostgreSQL 16, Prisma ORM
- **Cache/Queue:** Redis 7, BullMQ
- **Auth:** Better Auth
- **AI:** Anthropic Claude API (user-provided keys)
- **Storage:** Cloudflare R2
- **Email:** Gmail API (read-only OAuth2)

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.
