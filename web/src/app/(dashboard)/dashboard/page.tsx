"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { MatchScoreBadge } from "@/components/jobs/match-score";
import { DashboardStatsSkeleton, JobListSkeleton } from "@/components/shared/loading";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

// Search phases shown in the progress bar
const SEARCH_PHASES = [
  "Connecting to Claude...",
  "Searching job boards...",
  "Scanning LinkedIn & Indeed...",
  "Checking company career pages...",
  "Analyzing matches...",
  "Scoring and ranking jobs...",
  "Saving top matches...",
];

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
  const { data: stats, isLoading, refetch: refetchStats } = trpc.job.getDashboardStats.useQuery();
  const triggerSearch = trpc.job.triggerSearch.useMutation();

  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchPhase, setSearchPhase] = useState("");
  const [jobsFound, setJobsFound] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (phaseRef.current) clearInterval(phaseRef.current);
  }

  async function handleSearchNow() {
    if (searching) return;
    setSearching(true);
    setSearchProgress(5);
    setSearchPhase(SEARCH_PHASES[0]);
    setJobsFound(null);

    try {
      // Create a search run record first
      const { searchRunId } = await triggerSearch.mutateAsync({});

      // Animate progress phases while search runs
      let phaseIdx = 0;
      phaseRef.current = setInterval(() => {
        phaseIdx = Math.min(phaseIdx + 1, SEARCH_PHASES.length - 1);
        setSearchPhase(SEARCH_PHASES[phaseIdx]);
        // Smoothly advance to max 85% — final % comes from completion
        setSearchProgress((p) => Math.min(p + Math.random() * 10 + 5, 85));
      }, 8000);

      // Kick off the actual search (long-running)
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchRunId }),
      });

      stopPolling();

      const data = await res.json();

      if (res.status === 402) {
        // Free limit reached
        throw new Error(data.message ?? "Free search limit reached. Add your Claude API key in Settings.");
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setSearchProgress(100);
      setSearchPhase("Done!");
      setJobsFound(data.jobsFound ?? 0);

      const remaining = data.freeSearchesRemaining ?? 0;
      toast.success(`Found ${data.jobsFound} matching jobs!`, {
        description: remaining > 0
          ? `${remaining} free search${remaining === 1 ? "" : "es"} remaining.`
          : "You've used all free searches. Add your Claude API key to continue.",
      });

      // Refresh stats and job list
      await refetchStats();

      setTimeout(() => {
        setSearching(false);
        setSearchProgress(0);
        setSearchPhase("");
      }, 2000);
    } catch (err: unknown) {
      stopPolling();
      setSearching(false);
      setSearchProgress(0);
      setSearchPhase("");
      const msg = err instanceof Error ? err.message : "Search failed";
      toast.error(msg);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

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
          disabled={searching}
          className="gap-2"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? "Searching..." : "Search Now"}
        </Button>
      </div>

      {/* Search progress bar */}
      {searching && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="font-medium text-primary">{searchPhase}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {searchProgress < 100 ? `${Math.round(searchProgress)}%` : "Complete!"}
              </span>
            </div>
            <Progress value={searchProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Searching across LinkedIn, Indeed, Glassdoor, Wellfound and company career pages.
              This takes 1–3 minutes — please keep this tab open.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Jobs found banner */}
      {jobsFound !== null && !searching && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-400">
                  Search complete — {jobsFound} new jobs added
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => router.push("/jobs")}>
                View jobs <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
      {lastRun && !searching && (
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
            <h2 className="font-semibold text-sm">Top Matches</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => router.push("/jobs?sortBy=matchScore&sortDir=desc")}
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
                No jobs yet. Click{" "}
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
