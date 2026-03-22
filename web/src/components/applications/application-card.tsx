"use client";

import { useState } from "react";
import { Building2, MapPin, Calendar, ChevronDown, ChevronUp, ExternalLink, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "@/components/jobs/match-score";
import { StatusTimeline } from "@/components/applications/status-timeline";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  APPLYING: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PHONE_SCREEN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  INTERVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OFFER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WITHDRAWN: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  APPLYING: "Preparing",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

interface HistoryEntry {
  status: string;
  date: string;
  source?: string;
  notes?: string;
}

interface ApplicationCardProps {
  application: {
    id: string;
    status: string;
    appliedDate: Date | null;
    notes: string | null;
    statusHistory: unknown;
    updatedAt: Date;
    job: {
      id: string;
      title: string;
      company: string;
      location: string | null;
      matchScore: number | null;
      url: string;
    };
  };
  isDragging?: boolean;
}

export function ApplicationCard({ application, isDragging }: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);
  const utils = trpc.useUtils();

  const addNoteMutation = trpc.application.addNote.useMutation({
    onSuccess: () => {
      setNotesSaved(true);
      utils.application.getKanbanData.invalidate();
    },
  });

  function handleNoteChange(v: string) {
    setNotes(v);
    setNotesSaved(false);
  }

  function saveNotes() {
    addNoteMutation.mutate({ id: application.id, notes });
  }

  const history = Array.isArray(application.statusHistory)
    ? (application.statusHistory as HistoryEntry[])
    : [];

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1"
      )}
    >
      {/* Card header — always visible */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{application.job.title}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{application.job.company}</span>
            </div>
          </div>
          {application.job.matchScore != null && (
            <MatchScoreBadge score={application.job.matchScore} />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {application.job.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {application.job.location}
              </span>
            )}
            {application.appliedDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(application.appliedDate), { addSuffix: true })}
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {/* External link */}
          <a
            href={application.job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View job posting
          </a>

          {/* Status timeline */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Timeline
              </p>
              <StatusTimeline history={history} />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </p>
            <Textarea
              value={notes}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Add notes about this application…"
              className="text-xs min-h-[72px] resize-none"
            />
            {!notesSaved && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={saveNotes}
                disabled={addNoteMutation.isPending}
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
