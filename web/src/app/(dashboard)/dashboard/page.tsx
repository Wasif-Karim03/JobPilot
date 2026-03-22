"use client";

import { useRouter } from "next/navigation";
import {
  Briefcase,
  Sparkles,
  ClipboardList,
  TrendingUp,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/jobs/match-score";
import { DashboardStatsSkeleton, JobListSkeleton } from "@/components/shared/loading";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading } = trpc.job.getDashboardStats.useQuery();
  const triggerSearch = trpc.job.triggerSearch.useMutation();

  async function handleSearchNow() {
    try {
      const { searchRunId } = await triggerSearch.mutateAsync({});
      toast.success("Search queued! Jobs will appear shortly.", {
        description: `Run ID: ${searchRunId.slice(-8)}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger search";
      toast.error(msg);
    }
  }

  const lastRun = stats?.lastSearchRun;
  const runStatusIcon =
    lastRun?.status === "COMPLETED" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : lastRun?.status === "RUNNING" ? (
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    ) : lastRun?.status === "FAILED" ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your job search at a glance
          </p>
        </div>
        <Button
          onClick={handleSearchNow}
          disabled={triggerSearch.isPending}
          className="gap-2"
        >
          {triggerSearch.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search Now
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Briefcase}
            label="Total Jobs Found"
            value={stats?.totalJobs ?? 0}
            sub={stats?.newJobsToday ? `+${stats.newJobsToday} today` : undefined}
          />
          <StatCard
            icon={Sparkles}
            label="High Matches (80%+)"
            value={stats?.highMatchJobs ?? 0}
            color="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={ClipboardList}
            label="Applications"
            value={stats?.applicationCount ?? 0}
          />
          <StatCard
            icon={TrendingUp}
            label="New Today"
            value={stats?.newJobsToday ?? 0}
          />
        </div>
      )}

      {/* Last search run */}
      {lastRun && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 text-sm">
              {runStatusIcon}
              <span className="text-muted-foreground">Last search:</span>
              <span className="font-medium capitalize">{lastRun.status.toLowerCase()}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(lastRun.createdAt), { addSuffix: true })}
              </span>
              {lastRun.jobsFound > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {lastRun.jobsFound} jobs found
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top matches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-500" />
            <h2 className="font-semibold text-sm">Top Matches (80%+)</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => router.push("/jobs?minMatchScore=80&sortBy=matchScore&sortDir=desc")}
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <JobListSkeleton />
        ) : stats?.topJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No high-match jobs yet. Click{" "}
                <button
                  onClick={handleSearchNow}
                  className="text-primary hover:underline font-medium"
                >
                  Search Now
                </button>{" "}
                to find your first matches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {stats?.topJobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                      {job.location && (
                        <p className="text-xs text-muted-foreground/60">{job.location}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <MatchScoreBadge score={job.matchScore} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(job.discoveredAt), { addSuffix: true })}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/jobs")}>
              View all jobs
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/applications")}>
              Track applications
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/resume")}>
              Edit resume
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              Update preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
