"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/job-card";
import { JobFiltersBar, type JobFilters } from "@/components/jobs/job-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { JobListSkeleton } from "@/components/shared/loading";
import { trpc } from "@/lib/trpc-client";

const DEFAULT_FILTERS: JobFilters = {
  search: "",
  status: "all",
  minMatchScore: 0,
  sortBy: "discoveredAt",
  sortDir: "desc",
};

function JobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<JobFilters>({
    search: searchParams.get("search") ?? "",
    status: searchParams.get("status") ?? "all",
    minMatchScore: searchParams.get("minMatchScore") ? parseInt(searchParams.get("minMatchScore")!) : 0,
    sortBy: searchParams.get("sortBy") ?? "discoveredAt",
    sortDir: searchParams.get("sortDir") ?? "desc",
  });
  const [page, setPage] = useState(1);

  type JobStatus =
    | "DISCOVERED"
    | "BOOKMARKED"
    | "APPLYING"
    | "APPLIED"
    | "PHONE_SCREEN"
    | "INTERVIEW"
    | "OFFER"
    | "REJECTED"
    | "WITHDRAWN"
    | "ARCHIVED";

  const { data, isLoading, isFetching } = trpc.job.list.useQuery({
    search: filters.search || undefined,
    status: filters.status !== "all" ? (filters.status as JobStatus) : undefined,
    minMatchScore: filters.minMatchScore > 0 ? filters.minMatchScore : undefined,
    sortBy: filters.sortBy as "matchScore" | "discoveredAt" | "company",
    sortDir: filters.sortDir as "asc" | "desc",
    page,
    pageSize: 20,
  });

  const handleFilterChange = useCallback((partial: Partial<JobFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.totalCount != null
              ? `${data.totalCount} job${data.totalCount !== 1 ? "s" : ""} found`
              : "Loading..."}
          </p>
        </div>
        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <JobFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {isLoading ? (
        <JobListSkeleton />
      ) : data?.jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description={
            filters.search || filters.status !== "all" || filters.minMatchScore > 0
              ? "Try adjusting your filters"
              : "Trigger a search from the dashboard to discover matching jobs"
          }
          action={
            filters.search || filters.status !== "all" || filters.minMatchScore > 0
              ? { label: "Clear filters", onClick: handleReset }
              : { label: "Go to Dashboard", onClick: () => router.push("/dashboard") }
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {data?.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="space-y-5 max-w-4xl"><div className="h-8 w-32 bg-muted animate-pulse rounded" /></div>}>
      <JobsContent />
    </Suspense>
  );
}
