"use client";

import Link from "next/link";
import { MapPin, ExternalLink, Clock, Bookmark, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchScoreBadge } from "@/components/jobs/match-score";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DISCOVERED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  BOOKMARKED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  APPLYING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  APPLIED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  PHONE_SCREEN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  INTERVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  OFFER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  WITHDRAWN: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    salaryRange: string | null;
    matchScore: number | null;
    status: string;
    discoveredAt: Date;
    url: string;
  };
  onHide?: (id: string) => void;
  onBookmark?: (id: string) => void;
}

export function JobCard({ job, onHide, onBookmark }: JobCardProps) {
  const updateStatus = trpc.job.updateStatus.useMutation();
  const hide = trpc.job.hide.useMutation();
  const utils = trpc.useUtils();

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    if (job.status !== "DISCOVERED") return;
    try {
      await updateStatus.mutateAsync({ id: job.id, status: "BOOKMARKED" });
      utils.job.list.invalidate();
      onBookmark?.(job.id);
    } catch {
      toast.error("Failed to bookmark job");
    }
  }

  async function handleHide(e: React.MouseEvent) {
    e.preventDefault();
    try {
      await hide.mutateAsync({ id: job.id });
      utils.job.list.invalidate();
      onHide?.(job.id);
    } catch {
      toast.error("Failed to hide job");
    }
  }

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="group rounded-lg border bg-card hover:border-primary/50 transition-colors p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground">{job.company}</p>
              </div>
              <MatchScoreBadge score={job.matchScore} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.salaryRange && (
            <span className="text-green-600 dark:text-green-400 font-medium">{job.salaryRange}</span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(job.discoveredAt), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              STATUS_COLORS[job.status] ?? STATUS_COLORS.DISCOVERED
            )}
          >
            {formatStatus(job.status)}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {job.status === "DISCOVERED" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleBookmark}
                title="Bookmark"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleHide}
              title="Hide"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open original">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </Link>
  );
}
