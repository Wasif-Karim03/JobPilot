"use client";

import { Database, Activity, Wifi, Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { formatDistanceToNow } from "date-fns";

function QueueCard({
  name,
  stats,
}: {
  name: string;
  stats: { waiting: number; active: number; completed: number; failed: number };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-amber-600">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Database;
  label: string;
  status: "connected" | "error" | "unknown";
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </div>
      {status === "connected" ? (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      ) : status === "error" ? (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      ) : (
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
          Unknown
        </Badge>
      )}
    </div>
  );
}

export default function AdminSystemPage() {
  const { data: health, isLoading: healthLoading } = trpc.admin.getSystemHealth.useQuery();
  const { data: queues, isLoading: queuesLoading } = trpc.admin.getQueueStats.useQuery();

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">System</h1>

      {/* Service Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {healthLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <StatusRow icon={Database} label="Database (PostgreSQL)" status={health?.database ?? "unknown"} />
              <StatusRow icon={Wifi} label="Redis" status={health?.redis ?? "unknown"} />
              <StatusRow icon={Activity} label="Worker Service" status={health?.worker ?? "unknown"} />
              {health?.lastSearchRun && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last Search Run
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(health.lastSearchRun), { addSuffix: true })}
                  </span>
                </div>
              )}
              {health?.errorRate !== undefined && (
                <div className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Error Rate (24h)
                  </div>
                  <span
                    className={
                      health.errorRate > 0.1
                        ? "text-red-600 font-medium"
                        : health.errorRate > 0
                        ? "text-amber-600"
                        : "text-green-600"
                    }
                  >
                    {Math.round(health.errorRate * 100)}%
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Queue Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Queue Stats</h2>
        {queuesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : queues ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QueueCard name="Job Search" stats={queues.jobSearch} />
            <QueueCard name="Match Analysis" stats={queues.matchAnalysis} />
            <QueueCard name="Company Intel" stats={queues.companyIntel} />
            <QueueCard name="Email Scan" stats={queues.emailScan} />
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Queue stats show real-time data when the worker service is connected. Worker must be deployed to Railway for live stats.
      </p>
    </div>
  );
}
