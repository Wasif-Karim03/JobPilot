"use client";

import { trpc } from "@/lib/trpc-client";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { DashboardStatsSkeleton } from "@/components/shared/loading";
import { Kanban } from "lucide-react";

export default function ApplicationsPage() {
  const { data, isLoading } = trpc.application.getKanbanData.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  const columns = data?.columns ?? {};

  const totalCount = Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Kanban className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Applications</h1>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">({totalCount} total)</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag cards between columns to update status. Click a card to expand details.
        </p>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <KanbanBoard columns={columns} />
      </div>
    </div>
  );
}
