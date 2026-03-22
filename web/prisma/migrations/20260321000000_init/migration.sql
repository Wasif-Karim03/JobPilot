-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SearchDepth" AS ENUM ('LIGHT', 'STANDARD', 'DEEP');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DISCOVERED', 'BOOKMARKED', 'APPLYING', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutreachType" AS ENUM ('EMAIL', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('DRAFT', 'SENT', 'REPLIED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "ContactRelationType" AS ENUM ('ALUMNI', 'CEO', 'CTO', 'VP_ENGINEERING', 'ENGINEERING_MANAGER', 'HR_RECRUITER', 'HIRING_MANAGER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "SearchRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResumeFormat" AS ENUM ('STRUCTURED', 'RICH_TEXT', 'UPLOADED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "google_id" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "id_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_api_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "claude_api_key_encrypted" TEXT NOT NULL,
    "claude_api_key_iv" TEXT NOT NULL,
    "research_model" TEXT NOT NULL DEFAULT 'claude-opus-4-6',
    "execution_model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "search_depth" "SearchDepth" NOT NULL DEFAULT 'STANDARD',
    "daily_search_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_daily_api_cost" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_api_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_titles" TEXT[],
    "target_locations" TEXT[],
    "remote_preference" TEXT NOT NULL DEFAULT 'any',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "company_sizes" TEXT[],
    "industries" TEXT[],
    "exclude_companies" TEXT[],
    "experience_level" TEXT NOT NULL DEFAULT 'entry',
    "visa_sponsorship" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[],
    "search_time" TEXT NOT NULL DEFAULT '08:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gmail_email" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "access_token_iv" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "refresh_token_iv" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "last_scan_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Master Resume',
    "is_master" BOOLEAN NOT NULL DEFAULT false,
    "format" "ResumeFormat" NOT NULL DEFAULT 'STRUCTURED',
    "contact_info" JSONB,
    "summary" TEXT,
    "experience" JSONB,
    "education" JSONB,
    "skills" JSONB,
    "projects" JSONB,
    "certifications" JSONB,
    "custom_sections" JSONB,
    "rich_text_content" JSONB,
    "pdf_url" TEXT,
    "pdf_generated_at" TIMESTAMP(3),
    "raw_file_url" TEXT,
    "parsed_content" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "search_run_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "salary_range" TEXT,
    "posted_date" TIMESTAMP(3),
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_score" DOUBLE PRECISION,
    "match_analysis" JSONB,
    "missing_keywords" TEXT[],
    "match_suggestions" JSONB,
    "company_info" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'DISCOVERED',
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "user_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_contacts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "email_confidence" INTEGER,
    "linkedin_url" TEXT,
    "is_alumni" BOOLEAN NOT NULL DEFAULT false,
    "alumni_school" TEXT,
    "relationship_type" "ContactRelationType" NOT NULL,
    "outreach_priority" INTEGER NOT NULL DEFAULT 0,
    "profile_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_drafts" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "type" "OutreachType" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'APPLIED',
    "applied_date" TIMESTAMP(3),
    "applied_via" TEXT,
    "status_history" JSONB NOT NULL DEFAULT '[]',
    "interview_dates" JSONB,
    "notes" TEXT,
    "resume_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailored_resumes" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "base_resume_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "changes" JSONB,
    "rich_text_content" JSONB,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tailored_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gmail_message_id" TEXT NOT NULL,
    "subject" TEXT,
    "sender" TEXT,
    "body_snippet" TEXT,
    "detected_company" TEXT,
    "detected_status" "JobStatus",
    "confidence" DOUBLE PRECISION,
    "linked_job_id" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "search_depth" "SearchDepth" NOT NULL,
    "status" "SearchRunStatus" NOT NULL DEFAULT 'QUEUED',
    "jobs_found" INTEGER NOT NULL DEFAULT 0,
    "jobs_matched" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error_log" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_api_configs_user_id_key" ON "user_api_configs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_preferences_user_id_key" ON "job_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_connections_user_id_key" ON "gmail_connections"("user_id");

-- CreateIndex
CREATE INDEX "resumes_user_id_is_master_idx" ON "resumes"("user_id", "is_master");

-- CreateIndex
CREATE INDEX "jobs_user_id_status_idx" ON "jobs"("user_id", "status");

-- CreateIndex
CREATE INDEX "jobs_user_id_match_score_idx" ON "jobs"("user_id", "match_score");

-- CreateIndex
CREATE INDEX "jobs_user_id_discovered_at_idx" ON "jobs"("user_id", "discovered_at");

-- CreateIndex
CREATE INDEX "jobs_company_idx" ON "jobs"("company");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_user_id_url_key" ON "jobs"("user_id", "url");

-- CreateIndex
CREATE INDEX "job_contacts_job_id_idx" ON "job_contacts"("job_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_contact_id_idx" ON "outreach_drafts"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_key" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "tailored_resumes_job_id_idx" ON "tailored_resumes"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "tailored_resumes_job_id_base_resume_id_key" ON "tailored_resumes"("job_id", "base_resume_id");

-- CreateIndex
CREATE INDEX "email_scans_user_id_scanned_at_idx" ON "email_scans"("user_id", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_scans_user_id_gmail_message_id_key" ON "email_scans"("user_id", "gmail_message_id");

-- CreateIndex
CREATE INDEX "search_runs_user_id_created_at_idx" ON "search_runs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_api_configs" ADD CONSTRAINT "user_api_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_preferences" ADD CONSTRAINT "job_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_search_run_id_fkey" FOREIGN KEY ("search_run_id") REFERENCES "search_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_contacts" ADD CONSTRAINT "job_contacts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "job_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailored_resumes" ADD CONSTRAINT "tailored_resumes_base_resume_id_fkey" FOREIGN KEY ("base_resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

