"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EmailScan = {
  id: string;
  subject: string | null;
  sender: string | null;
  bodySnippet: string | null;
  detectedCompany: string | null;
  detectedStatus: string | null;
  confidence: number | null;
  emailDate: Date | string | null;
  scannedAt: Date | string;
};

type CompanySummary = {
  company: string;
  latestStatus: string | null;
  emailCount: number;
  latestEmailDate: Date | string | null;
  emails: EmailScan[];
};

interface TrackerApplicationsProps {
  companies: CompanySummary[];
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  APPLIED: { label: "Applied", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PHONE_SCREEN: { label: "Phone Screen", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  INTERVIEW: { label: "Interview", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  OFFER: { label: "Offer 🎉", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">Unknown</span>;
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.className)}>
      {config.label}
    </span>
  );
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function CompanyRow({ company }: { company: CompanySummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{company.company}</span>
            <StatusBadge status={company.latestStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {company.emailCount} email{company.emailCount !== 1 ? "s" : ""} ·{" "}
            Last: {formatDate(company.latestEmailDate)}
          </p>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Email timeline */}
      {open && (
        <div className="border-t divide-y">
          {company.emails.map((email, idx) => (
            <div key={email.id} className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full mt-1",
                    idx === 0 ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                />
                {idx < company.emails.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {email.subject ?? "(No subject)"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email.sender ?? "Unknown sender"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={email.detectedStatus} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(email.emailDate ?? email.scannedAt)}
                    </span>
                  </div>
                </div>

                {email.bodySnippet && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {email.bodySnippet}
                  </p>
                )}

                {email.confidence !== null && email.confidence < 0.7 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Low confidence detection ({Math.round(email.confidence * 100)}%)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrackerApplications({ companies, isLoading }: TrackerApplicationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-sm">No emails tracked yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Click &quot;Sync Now&quot; to scan your Gmail for job application emails from your start date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companies.map((company) => (
        <CompanyRow key={company.company} company={company} />
      ))}
    </div>
  );
}
