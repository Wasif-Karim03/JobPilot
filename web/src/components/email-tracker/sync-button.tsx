"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  lastSyncAt: Date | null;
  onSynced: () => void;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SyncButton({ lastSyncAt, onSynced }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const utils = trpc.useUtils();

  const triggerSync = trpc.emailTracker.triggerSync.useMutation({
    onSuccess: async () => {
      setSyncing(false);
      toast.success(
        "Sync queued! Your emails are being processed in the background — refresh in a moment."
      );
      // Invalidate and refetch after a short delay so the UI updates
      setTimeout(async () => {
        await Promise.all([
          utils.emailTracker.getStats.invalidate(),
          utils.emailTracker.getTrackedEmails.invalidate(),
          utils.emailTracker.getCompaniesSummary.invalidate(),
        ]);
        onSynced();
      }, 3000);
    },
    onError: (err) => {
      setSyncing(false);
      toast.error(err.message);
    },
  });

  function handleSync() {
    setSyncing(true);
    triggerSync.mutate();
  }

  return (
    <div className="flex items-center gap-3">
      {lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          Last synced {timeAgo(new Date(lastSyncAt))}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing || triggerSync.isPending}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
          syncing || triggerSync.isPending
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <RefreshCw className={cn("h-4 w-4", (syncing || triggerSync.isPending) && "animate-spin")} />
        {syncing || triggerSync.isPending ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}
