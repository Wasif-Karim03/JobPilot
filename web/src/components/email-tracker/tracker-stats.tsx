"use client";

import {
  SendHorizonal,
  PhoneCall,
  XCircle,
  Trophy,
  Clock,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackerStatsProps {
  stats: {
    total: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    pending: number;
  };
}

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Emails Tracked",
    icon: Mail,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "applied" as const,
    label: "Applied",
    icon: SendHorizonal,
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  {
    key: "interviews" as const,
    label: "Interviews",
    icon: PhoneCall,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    key: "offers" as const,
    label: "Offers",
    icon: Trophy,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    key: "rejected" as const,
    label: "Rejected",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-900/30",
  },
] as const;

export function TrackerStats({ stats }: TrackerStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="border rounded-xl p-4 flex flex-col gap-3">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", bg)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{stats[key]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
