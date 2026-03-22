# Database Schema — JobPilot

PostgreSQL 14+ (local dev) / PostgreSQL 16 (production Railway)
ORM: Prisma 5.x | Provider: `postgresql`

---

## Tables Overview

| Table               | Rows (seed) | Purpose                                       |
| ------------------- | ----------- | --------------------------------------------- |
| `users`             | 3           | Platform accounts (job seekers + admin)       |
| `sessions`          | 0           | Better Auth session tokens                    |
| `accounts`          | 0           | OAuth provider accounts (Google)              |
| `verifications`     | 0           | Email verification / password reset tokens    |
| `user_api_configs`  | 0           | Encrypted Claude API key + search settings    |
| `job_preferences`   | 2           | Target titles, locations, salary, etc.        |
| `gmail_connections` | 0           | Encrypted Gmail OAuth tokens                  |
| `resumes`           | 5           | Master and tailored resume versions           |
| `jobs`              | 15          | Jobs discovered by AI search engine           |
| `job_contacts`      | 2           | Contacts discovered at target companies       |
| `outreach_drafts`   | 1           | AI-generated email/LinkedIn message drafts    |
| `applications`      | 5           | Active job applications with status history   |
| `tailored_resumes`  | 0           | Resume copies tailored for specific jobs      |
| `email_scans`       | 0           | Gmail messages scanned for application status |
| `search_runs`       | 3           | Audit log for AI job search executions        |

---

## Enums

| Enum                  | Values                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `UserRole`            | `USER`, `ADMIN`                                                                                                              |
| `SearchDepth`         | `LIGHT`, `STANDARD`, `DEEP`                                                                                                  |
| `JobStatus`           | `DISCOVERED`, `BOOKMARKED`, `APPLYING`, `APPLIED`, `PHONE_SCREEN`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`, `ARCHIVED` |
| `OutreachType`        | `EMAIL`, `LINKEDIN`                                                                                                          |
| `OutreachStatus`      | `DRAFT`, `SENT`, `REPLIED`, `NO_RESPONSE`                                                                                    |
| `ContactRelationType` | `ALUMNI`, `CEO`, `CTO`, `VP_ENGINEERING`, `ENGINEERING_MANAGER`, `HR_RECRUITER`, `HIRING_MANAGER`, `EMPLOYEE`, `OTHER`       |
| `SearchRunStatus`     | `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`                                                                      |
| `ResumeFormat`        | `STRUCTURED`, `RICH_TEXT`, `UPLOADED`                                                                                        |

---

## Table Descriptions

### `users`

Platform users — job seekers and admins.

| Column                | Type     | Notes                             |
| --------------------- | -------- | --------------------------------- |
| `id`                  | cuid     | Primary key                       |
| `email`               | string   | Unique, login identifier          |
| `name`                | string?  | Display name                      |
| `password_hash`       | string?  | bcrypt hash (null if Google-only) |
| `google_id`           | string?  | Unique Google OAuth ID            |
| `avatar_url`          | string?  | Profile picture URL               |
| `role`                | UserRole | `USER` or `ADMIN`                 |
| `onboarding_complete` | bool     | Redirects to onboarding if false  |
| `created_at`          | datetime |                                   |
| `updated_at`          | datetime | Auto-updated                      |

### `sessions`

Better Auth session store. One session per login.

| Column       | Type     | Notes                |
| ------------ | -------- | -------------------- |
| `token`      | string   | Unique session token |
| `expires_at` | datetime | 7-day TTL            |
| `ip_address` | string?  | For audit            |
| `user_agent` | string?  | For audit            |

### `accounts`

OAuth provider accounts. One row per connected provider per user.

### `verifications`

Email verification and password reset tokens used by Better Auth.

### `user_api_configs`

Per-user Claude API key (AES-256-GCM encrypted) and search configuration.

| Column                     | Type        | Notes                                                     |
| -------------------------- | ----------- | --------------------------------------------------------- |
| `claude_api_key_encrypted` | string      | Hex-encoded AES-256-GCM ciphertext with appended auth tag |
| `claude_api_key_iv`        | string      | Hex-encoded 16-byte IV                                    |
| `research_model`           | string      | Default: `claude-opus-4-6`                                |
| `execution_model`          | string      | Default: `claude-sonnet-4-6`                              |
| `search_depth`             | SearchDepth | Default: `STANDARD`                                       |
| `daily_search_enabled`     | bool        | Toggle cron-triggered search                              |
| `max_daily_api_cost`       | float       | Hard cap in USD                                           |

### `job_preferences`

User's job search criteria — what kind of jobs to find.

| Column              | Type     | Notes                                                |
| ------------------- | -------- | ---------------------------------------------------- |
| `target_titles`     | string[] | e.g. `["Software Engineer", "Backend"]`              |
| `target_locations`  | string[] | e.g. `["Remote", "Columbus, OH"]`                    |
| `remote_preference` | string   | `remote` / `hybrid` / `onsite` / `any`               |
| `salary_min`        | int?     | Annual USD                                           |
| `salary_max`        | int?     | Annual USD                                           |
| `company_sizes`     | string[] | `startup` / `small` / `mid` / `large` / `enterprise` |
| `industries`        | string[] | e.g. `["tech", "fintech", "robotics"]`               |
| `exclude_companies` | string[] | Companies to skip in search                          |
| `experience_level`  | string   | `intern` / `entry` / `mid` / `senior`                |
| `visa_sponsorship`  | bool     | Whether sponsorship is required                      |
| `keywords`          | string[] | Extra search terms                                   |
| `search_time`       | string   | `HH:MM` for daily search trigger                     |
| `timezone`          | string   | IANA timezone string                                 |

### `gmail_connections`

Encrypted Gmail OAuth tokens for read-only inbox scanning.

- Both `access_token` and `refresh_token` are AES-256-GCM encrypted
- Each token has its own IV column
- `is_active` = false if user revokes or tokens fail to refresh

### `resumes`

Master and tailored resume versions. A user has one master resume and can have multiple tailored copies.

| Column              | Type         | Notes                                       |
| ------------------- | ------------ | ------------------------------------------- |
| `is_master`         | bool         | Exactly one master resume per user          |
| `format`            | ResumeFormat | `STRUCTURED`, `RICH_TEXT`, or `UPLOADED`    |
| `contact_info`      | json?        | `{name, email, phone, linkedin, ...}`       |
| `experience`        | json?        | Array of work experience entries            |
| `education`         | json?        | Array of education entries                  |
| `skills`            | json?        | `{technical, frameworks, tools, languages}` |
| `projects`          | json?        | Array of project entries                    |
| `rich_text_content` | json?        | TipTap editor JSON (alternative format)     |
| `pdf_url`           | string?      | Cloudflare R2 URL of generated PDF          |
| `raw_file_url`      | string?      | R2 URL of originally uploaded file          |
| `parsed_content`    | text?        | Plain-text extraction for AI matching       |
| `version`           | int          | Auto-incremented on update                  |

### `jobs`

Jobs discovered by the AI search engine.

| Column              | Type      | Notes                                                 |
| ------------------- | --------- | ----------------------------------------------------- |
| `url`               | string    | Original job posting URL (unique per user)            |
| `source`            | string    | `web_search` / `indeed` / `linkedin` / `company_site` |
| `match_score`       | float?    | 0–100, null until worker analyzes                     |
| `match_analysis`    | json?     | `{titleMatch, skillsMatch, experienceMatch}`          |
| `missing_keywords`  | string[]  | Keywords to add to resume for better match            |
| `match_suggestions` | json?     | Specific resume improvement suggestions               |
| `company_info`      | json?     | Company size, industry, description (for 80%+)        |
| `status`            | JobStatus | Default: `DISCOVERED`                                 |
| `is_hidden`         | bool      | Soft-delete (archived from view)                      |

**Unique constraint:** `(user_id, url)` — prevents duplicate job discovery per user.

### `job_contacts`

Contacts discovered at a target company via AI research.

| Column              | Type                | Notes                            |
| ------------------- | ------------------- | -------------------------------- |
| `email_confidence`  | int?                | Hunter.io confidence score 0–100 |
| `is_alumni`         | bool                | Shares user's university         |
| `relationship_type` | ContactRelationType |                                  |
| `outreach_priority` | int                 | Higher = reach out first         |

### `outreach_drafts`

AI-generated email or LinkedIn note drafts for each contact.

- LinkedIn `content` must be ≤ 200 characters
- `status` tracks draft → sent → replied lifecycle

### `applications`

Active job applications with full status history.

| Column            | Type    | Notes                                               |
| ----------------- | ------- | --------------------------------------------------- |
| `status_history`  | json    | Array of `{status, date, source, notes}`            |
| `interview_dates` | json?   | Array of `{date, type, notes}`                      |
| `resume_used`     | string? | ID of Resume used for this application              |
| `applied_via`     | string? | `company_site` / `linkedin` / `indeed` / `referral` |

### `tailored_resumes`

A copy of a base resume modified for a specific job. Linked to both `jobs` and `resumes`.

### `email_scans`

Gmail messages scanned for job application status signals.

| Column            | Type       | Notes                                |
| ----------------- | ---------- | ------------------------------------ |
| `detected_status` | JobStatus? | e.g. `REJECTED`, `PHONE_SCREEN`      |
| `confidence`      | float?     | 0.0–1.0 AI classification confidence |
| `linked_job_id`   | string?    | Matched job if found                 |
| `processed`       | bool       | Whether status update was applied    |

**Unique constraint:** `(user_id, gmail_message_id)`

### `search_runs`

Audit log for each AI job search execution.

| Column           | Type            | Notes                      |
| ---------------- | --------------- | -------------------------- |
| `search_depth`   | SearchDepth     |                            |
| `status`         | SearchRunStatus |                            |
| `jobs_found`     | int             | Total jobs discovered      |
| `jobs_matched`   | int             | Jobs above match threshold |
| `api_calls`      | int             | Number of Claude API calls |
| `estimated_cost` | float           | Estimated USD cost         |
| `error_log`      | text?           | Error details if FAILED    |

---

## Indexes

| Table              | Index                      | Purpose                     |
| ------------------ | -------------------------- | --------------------------- |
| `sessions`         | `(user_id)`                | Fast session lookup by user |
| `accounts`         | `(user_id)`                | OAuth account lookup        |
| `resumes`          | `(user_id, is_master)`     | Find master resume quickly  |
| `jobs`             | `(user_id, status)`        | Dashboard filtering         |
| `jobs`             | `(user_id, match_score)`   | Sort by best match          |
| `jobs`             | `(user_id, discovered_at)` | Chronological feed          |
| `jobs`             | `(company)`                | Company search              |
| `job_contacts`     | `(job_id)`                 | Contacts for a job          |
| `outreach_drafts`  | `(contact_id)`             | Drafts for a contact        |
| `applications`     | `(user_id, status)`        | Kanban board grouping       |
| `tailored_resumes` | `(job_id)`                 | Tailored resumes for a job  |
| `email_scans`      | `(user_id, scanned_at)`    | Recent scans query          |
| `search_runs`      | `(user_id, created_at)`    | Search history              |

---

## Relationships

```
User
 ├── Session[] (Better Auth)
 ├── Account[] (OAuth providers)
 ├── UserApiConfig (1:1, encrypted Claude API key)
 ├── JobPreferences (1:1, search criteria)
 ├── GmailConnection (1:1, OAuth tokens)
 ├── Resume[]
 │    └── TailoredResume[] (for each job)
 ├── Job[]
 │    ├── JobContact[]
 │    │    └── OutreachDraft[]
 │    ├── Application (1:1)
 │    └── TailoredResume[]
 └── SearchRun[]
      └── Job[] (jobs found in this run)
```

---

## Development Notes

- **Local dev:** PostgreSQL 14 via Homebrew on `localhost:5432`
- **Production:** PostgreSQL 16 on Railway
- **Prisma migration path:** Schema changes → `prisma migrate dev --name <name>` → commit migration file
- **Seed:** `pnpm --filter web db:seed` (creates 3 users, 5 resumes, 15 jobs, 5 applications, 3 search runs)
- **Reset dev DB:** `pnpm --filter web db:reset` (drops + recreates + seeds)
