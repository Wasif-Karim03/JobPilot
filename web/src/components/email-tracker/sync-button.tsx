"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  lastSyncAt: Date | string | null;
  onSynced: () => void;
}

type SyncState = "idle" | "queued" | "running" | "done" | "failed";

function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SyncButton({ lastSyncAt, onSynced }: SyncButtonProps) {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utils = trpc.useUtils();

  const triggerSync = trpc.emailTracker.triggerSync.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
      setSyncState("queued");
      setPercent(0);
      setMessage("Queued…");
    },
    onError: (err) => {
      setSyncState("failed");
      setMessage(err.message);
      toast.error(err.message);
    },
  });

  // Poll for progress once we have a jobId
  const { data: statusData } = trpc.emailTracker.getSyncStatus.useQuery(
    { jobId: jobId ?? "" },
    {
      enabled: !!jobId && (syncState === "queued" || syncState === "running"),
      refetchInterval: 1500, // poll every 1.5s
    }
  );

  useEffect(() => {
    if (!statusData) return;

    const { state, percent: p, message: m } = statusData;

    setPercent(p);
    setMessage(m);

    if (state === "active") {
      setSyncState("running");
    }

    if (state === "completed" || p >= 100) {
      setSyncState("done");
      setPercent(100);
      // Refresh data after a short delay
      setTimeout(async () => {
        await Promise.all([
          utils.emailTracker.getStats.invalidate(),
          utils.emailTracker.getTrackedEmails.invalidate(),
          utils.emailTracker.getCompaniesSummary.invalidate(),
        ]);
        onSynced();
        // Reset to idle after showing "Done" for 3s
        setTimeout(() => {
          setSyncState("idle");
          setJobId(null);
          setPercent(0);
          setMessage("");
        }, 3000);
      }, 500);
    }

    if (state === "failed") {
      setSyncState("failed");
      toast.error("Sync failed. Check your API key and Gmail connection.");
      setTimeout(() => {
        setSyncState("idle");
        setJobId(null);
      }, 4000);
    }
  }, [statusData, utils, onSynced]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isActive = syncState === "queued" || syncState === "running";

  // ── Idle state — just the button ──────────────────────────────────────────
  if (syncState === "idle") {
    return (
      <div className="flex items-center gap-3">
        {lastSyncAt && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            Last synced {timeAgo(lastSyncAt)}
          </span>
        )}
        <button
          onClick={() => triggerSync.mutate()}
          disabled={triggerSync.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Sync Now
        </button>
      </div>
    );
  }

  // ── Active / Done / Failed — show progress panel ──────────────────────────
  return (
    <div className="w-full border rounded-xl p-4 bg-muted/30 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {syncState === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : syncState === "failed" ? (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <RefreshCw className="h-4 w-4 text-primary animate-spin shrink-0" />
          )}
          <span className="text-sm font-medium">
            {syncState === "done"
              ? "Sync Complete"
              : syncState === "failed"
                ? "Sync Failed"
                : syncState === "queued"
                  ? "Waiting for worker…"
                  : "Syncing Gmail…"}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            syncState === "done"
              ? "text-emerald-600"
              : syncState === "failed"
                ? "text-red-600"
                : "text-primary"
          )}
        >
          {percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            syncState === "done"
              ? "bg-emerald-500"
              : syncState === "failed"
                ? "bg-red-500"
                : isActive
                  ? "bg-primary"
                  : "bg-primary/50"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Status message */}
      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
    </div>
  );
}
