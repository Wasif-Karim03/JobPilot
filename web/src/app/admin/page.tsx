"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Briefcase,
  ClipboardList,
  Search,
  Activity,
  Database,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc-client";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: "connected" | "error" | "unknown" }) {
  const map = {
    connected: { color: "bg-green-500", label: "Connected" },
    error: { color: "bg-red-500", label: "Error" },
    unknown: { color: "bg-amber-400", label: "Unknown" },
  };
  const { color, label } = map[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = trpc.admin.getDashboard.useQuery();
  const { data: health } = trpc.admin.getSystemHealth.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={data?.totalUsers ?? 0} />
        <StatCard
          icon={Activity}
          label="Active (7d)"
          value={data?.activeUsers ?? 0}
          color="text-green-600"
        />
        <StatCard icon={Briefcase} label="Total Jobs" value={data?.totalJobs ?? 0} />
        <StatCard
          icon={ClipboardList}
          label="Applications"
          value={data?.totalApplications ?? 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet</p>
            ) : (
              <div className="space-y-2">
                {data?.recentSignups.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{user.name ?? user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role === "ADMIN" && (
                        <Badge variant="outline" className="text-xs">Admin</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Database
              </div>
              <StatusDot status={health?.database ?? "unknown"} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wifi className="h-4 w-4" />
                Redis
              </div>
              <StatusDot status={health?.redis ?? "unknown"} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Worker
              </div>
              <StatusDot status={health?.worker ?? "unknown"} />
            </div>
            {health?.lastSearchRun && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Last search run:{" "}
                {formatDistanceToNow(new Date(health.lastSearchRun), { addSuffix: true })}
              </div>
            )}
            {health?.errorRate !== undefined && health.errorRate > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
                <AlertCircle className="h-3 w-3" />
                Error rate (24h): {Math.round(health.errorRate * 100)}%
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                Total Search Runs
              </div>
              <span className="text-sm font-medium">{data?.totalSearchRuns ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Server({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}
