"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc-client";
import { ApplicationCard } from "@/components/applications/application-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: "APPLYING", label: "Preparing", color: "border-sky-400" },
  { id: "APPLIED", label: "Applied", color: "border-blue-400" },
  { id: "PHONE_SCREEN", label: "Phone Screen", color: "border-violet-400" },
  { id: "INTERVIEW", label: "Interview", color: "border-amber-400" },
  { id: "OFFER", label: "Offer", color: "border-green-400" },
  { id: "REJECTED", label: "Rejected", color: "border-red-400" },
] as const;

type KanbanStatus = (typeof COLUMNS)[number]["id"];

type ApplicationWithJob = {
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

// ─── Sortable card wrapper ────────────────────────────────────────────────────

function SortableCard({
  application,
  activeId,
}: {
  application: ApplicationWithJob;
  activeId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: application.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("touch-none", activeId === application.id && "opacity-40")}
    >
      <ApplicationCard application={application} />
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  cards,
  activeId,
}: {
  column: (typeof COLUMNS)[number];
  cards: ApplicationWithJob[];
  activeId: string | null;
}) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] shrink-0">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 bg-muted/50",
          column.color
        )}
      >
        <span className="text-sm font-medium">{column.label}</span>
        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
          {cards.length}
        </span>
      </div>

      {/* Droppable area */}
      <SortableContext
        id={column.id}
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="flex-1 rounded-b-lg border border-t-0 bg-muted/20 p-2 space-y-2 min-h-[120px]"
          data-column-id={column.id}
        >
          {cards.length === 0 ? (
            <div className="flex items-center justify-center h-[100px] text-xs text-muted-foreground border border-dashed rounded-md">
              Drop here
            </div>
          ) : (
            cards.map((app) => (
              <SortableCard key={app.id} application={app} activeId={activeId} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  columns: Record<string, ApplicationWithJob[]>;
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localColumns, setLocalColumns] =
    useState<Record<string, ApplicationWithJob[]>>(columns);

  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.application.updateStatus.useMutation({
    onSuccess: () => utils.application.getKanbanData.invalidate(),
    onError: () => {
      // Revert on error
      setLocalColumns(columns);
    },
  });

  // Keep local state in sync when props change (after invalidation)
  if (JSON.stringify(Object.keys(columns)) !== JSON.stringify(Object.keys(localColumns))) {
    setLocalColumns(columns);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findColumnOfCard(cardId: string): string | null {
    for (const [colId, cards] of Object.entries(localColumns)) {
      if (cards.find((c) => c.id === cardId)) return colId;
    }
    return null;
  }

  function getActiveCard(): ApplicationWithJob | null {
    if (!activeId) return null;
    for (const cards of Object.values(localColumns)) {
      const found = cards.find((c) => c.id === activeId);
      if (found) return found;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnOfCard(activeCardId);
    // overId could be a column id or a card id
    const destCol =
      COLUMNS.find((c) => c.id === overId)?.id ?? findColumnOfCard(overId);

    if (!sourceCol || !destCol || sourceCol === destCol) return;

    setLocalColumns((prev) => {
      const sourceCards = [...(prev[sourceCol] ?? [])];
      const destCards = [...(prev[destCol] ?? [])];
      const cardIdx = sourceCards.findIndex((c) => c.id === activeCardId);
      if (cardIdx === -1) return prev;

      const [card] = sourceCards.splice(cardIdx, 1);
      destCards.unshift({ ...card, status: destCol });

      return { ...prev, [sourceCol]: sourceCards, [destCol]: destCards };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const destCol =
      COLUMNS.find((c) => c.id === overId)?.id ?? findColumnOfCard(overId);
    const sourceCol = findColumnOfCard(activeCardId);

    if (!destCol || !sourceCol) return;

    // If column changed, persist to server
    if (sourceCol !== destCol) {
      updateStatusMutation.mutate({
        id: activeCardId,
        status: destCol as KanbanStatus,
      });
    }
  }

  const allApplications = Object.values(localColumns).flat();

  if (allApplications.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No applications yet"
        description="When you apply to a job, it will appear here to track your progress."
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={localColumns[col.id] ?? []}
            activeId={activeId}
          />
        ))}
      </div>

      {/* Drag overlay — renders the card while dragging */}
      <DragOverlay>
        {activeId && getActiveCard() ? (
          <div className="opacity-90 rotate-2 shadow-xl">
            <ApplicationCard application={getActiveCard()!} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
