import { CheckCircle2, Mail, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DISCOVERED: "Discovered",
  BOOKMARKED: "Bookmarked",
  APPLYING: "Preparing Application",
  APPLIED: "Applied",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer Received",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-500",
  PHONE_SCREEN: "bg-violet-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-green-500",
  REJECTED: "bg-red-500",
  WITHDRAWN: "bg-gray-400",
  APPLYING: "bg-sky-500",
  DISCOVERED: "bg-gray-400",
  BOOKMARKED: "bg-yellow-500",
  ARCHIVED: "bg-gray-300",
};

interface HistoryEntry {
  status: string;
  date: string;
  source?: string;
  notes?: string;
}

interface StatusTimelineProps {
  history: HistoryEntry[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (!history.length) {
    return <p className="text-sm text-muted-foreground">No status history yet.</p>;
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => (
        <div key={i} className="flex gap-3">
          {/* Line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full mt-1 shrink-0",
                STATUS_COLORS[entry.status] ?? "bg-gray-400"
              )}
            />
            {i < history.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[20px]" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {STATUS_LABELS[entry.status] ?? entry.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
              </span>
              {entry.source && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {entry.source === "email" ? (
                    <Mail className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {entry.source}
                </span>
              )}
            </div>
            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
