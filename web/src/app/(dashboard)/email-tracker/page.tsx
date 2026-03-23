"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { TrackerStats } from "@/components/email-tracker/tracker-stats";
import { TrackerApplications } from "@/components/email-tracker/tracker-applications";
import { SyncButton } from "@/components/email-tracker/sync-button";
import { StartDateDialog } from "@/components/email-tracker/start-date-dialog";
import { format } from "date-fns";
import {
  Mail,
  AlertCircle,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

export default function EmailTrackerPage() {
  const [showStartDateDialog, setShowStartDateDialog] = useState(false);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.emailTracker.getStats.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s for live updates
  });

  const {
    data: companies,
    isLoading: companiesLoading,
    refetch: refetchCompanies,
  } = trpc.emailTracker.getCompaniesSummary.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  function handleSynced() {
    void refetchStats();
    void refetchCompanies();
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!statsLoading && stats && !stats.connected) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Connect Your Gmail</h1>
        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
          To track your job application emails automatically, connect your Gmail account
          first. We only need read-only access.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Settings <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // ── Has no API key ─────────────────────────────────────────────────────────
  // (We can still show data if already synced, only warn for syncing)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Email Job Tracker</h1>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {stats?.email && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {stats.email}
              </span>
            )}
            {stats?.startDate && (
              <button
                onClick={() => setShowStartDateDialog(true)}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors group"
                title="Click to change start date"
              >
                <CalendarDays className="h-3 w-3" />
                Tracking since {format(new Date(stats.startDate), "MMM d, yyyy")}
                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                  (change)
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Set / change start date */}
          {stats && !stats.startDate && (
            <button
              onClick={() => setShowStartDateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              Set Start Date
            </button>
          )}

          {/* Sync button — only show if configured */}
          {stats?.startDate && (
            <SyncButton lastSyncAt={stats.lastSyncAt} onSynced={handleSynced} />
          )}
        </div>
      </div>

      {/* ── No start date set yet ────────────────────────────────────────── */}
      {!statsLoading && stats && stats.connected && !stats.startDate && (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Set your job search start date to begin tracking
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Tell us when you started applying so we know which emails to scan.{" "}
              <button
                onClick={() => setShowStartDateDialog(true)}
                className="underline font-medium"
              >
                Set it now →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 animate-pulse">
              <div className="h-9 w-9 rounded-lg bg-muted mb-3" />
              <div className="h-6 bg-muted rounded w-1/2 mb-1" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <TrackerStats stats={stats} />
      ) : null}

      {/* ── Applications by company ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Applications by Company
          </h2>
          {companies && companies.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {companies.length} compan{companies.length === 1 ? "y" : "ies"}
            </span>
          )}
        </div>

        <TrackerApplications
          companies={companies ?? []}
          isLoading={companiesLoading}
        />
      </div>

      {/* ── Auto-sync notice ─────────────────────────────────────────────── */}
      {stats?.startDate && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          Your inbox is scanned automatically every hour · Claude AI classifies each email
        </p>
      )}

      {/* ── Start date dialog ────────────────────────────────────────────── */}
      {showStartDateDialog && (
        <StartDateDialog
          onComplete={() => {
            setShowStartDateDialog(false);
            handleSynced();
          }}
        />
      )}
    </div>
  );
}
