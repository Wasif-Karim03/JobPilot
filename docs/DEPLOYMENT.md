# Deployment Guide — JobPilot

## Architecture

```
Internet → Vercel (Next.js) → Railway PostgreSQL
                            → Railway Redis
                            → Railway Worker (BullMQ)
```

## Prerequisites

- Vercel account (free tier)
- Railway account (~$5–15/mo)
- Cloudflare R2 bucket
- Google Cloud OAuth credentials
- Hunter.io API key (optional)
- Sentry project (optional)

---

## 1. Production Database & Redis (Railway)

```bash
# 1. Create Railway project
railway new

# 2. Add PostgreSQL service
railway add --plugin postgresql

# 3. Add Redis service
railway add --plugin redis

# 4. Get connection strings
railway variables
# Note DATABASE_URL and REDIS_URL
```

Run migrations against production:
```bash
cd web
DATABASE_URL="your-railway-db-url" pnpm exec prisma migrate deploy
DATABASE_URL="your-railway-db-url" pnpm run db:seed
```

---

## 2. Web App (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# From web/ directory
cd web
vercel --prod
```

### Required Environment Variables (Vercel)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL URL |
| `REDIS_URL` | Railway Redis URL |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://yourdomain.com` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | `jobpilot-resumes` |
| `R2_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `HUNTER_API_KEY` | Hunter.io API key |
| `SENTRY_DSN` | Sentry DSN (optional) |
| `ADMIN_EMAIL` | Your admin email |

---

## 3. Worker Service (Railway)

Create a `railway.toml` in the `worker/` directory:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm exec prisma generate && pnpm run build"

[deploy]
startCommand = "pnpm run start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

```bash
cd worker
railway up --service worker
```

### Required Environment Variables (Worker on Railway)

Same `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY` as web, plus:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Same as web |
| `GOOGLE_CLIENT_SECRET` | Same as web |
| `HUNTER_API_KEY` | Hunter.io API key |
| `LOG_LEVEL` | `info` |

---

## 4. GitHub Actions Secrets

Add these in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `ENCRYPTION_KEY` | Same 64-char hex as production |
| `RAILWAY_TOKEN` | Railway API token (from Railway dashboard) |

---

## 5. Post-Deploy Verification

```bash
# Check DB connectivity
curl https://yourdomain.com/api/trpc/user.getProfile

# Check auth works
# → Register, login, access dashboard

# Check worker is running
# → Railway dashboard → worker service → logs
# → Should see: "JobPilot Worker ready"

# Trigger manual search
# → Dashboard → "Search Now" button
# → Check jobs appear within 2-5 minutes

# Check cron is running
# → Every hour, worker logs: "Enqueueing daily searches"
```

---

## 6. Monitoring

- **Errors:** Sentry (configured via `SENTRY_DSN`)
- **Uptime:** BetterStack — point monitor at `https://yourdomain.com`
- **Logs:** Railway dashboard → service → logs
- **Queue stats:** Admin panel → `/admin/system`

---

## 7. Incident Response

### Worker stopped processing
```bash
railway restart --service worker
```

### Database connection pool exhausted
```bash
# Check Railway metrics → Postgres → active connections
# Scale up Railway instance or reduce Prisma connection limit
# In db.ts: PrismaClient({ datasources: { db: { url } }, log: [] })
```

### Redis full / eviction
```bash
# Upgrade Railway Redis plan
# Or increase TTL on BullMQ completed jobs:
# Worker queue option: removeOnComplete: { count: 1000, age: 24 * 3600 }
```

### Emergency: disable all searches
```bash
# In Railway: set DISABLE_SEARCHES=true
# Worker checks: if (process.env.DISABLE_SEARCHES) return;
```

---

## 8. Rollback

```bash
# Vercel auto-rollback via dashboard → Deployments → previous deploy → Promote

# Railway rollback
railway rollback --service worker
```
