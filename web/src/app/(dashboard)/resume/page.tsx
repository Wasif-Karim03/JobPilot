"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Star,
  Trash2,
  MoreVertical,
  FileType,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { ResumeListSkeleton } from "@/components/shared/loading";

const FORMAT_LABELS: Record<string, string> = {
  STRUCTURED: "Structured",
  RICH_TEXT: "Rich Text",
  UPLOADED: "Uploaded",
};

export default function ResumePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("My Resume");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: resumes, isLoading } = trpc.resume.list.useQuery();

  const createMutation = trpc.resume.create.useMutation({
    onSuccess: (resume) => {
      setCreateOpen(false);
      setNewTitle("My Resume");
      utils.resume.list.invalidate();
      router.push(`/resume/${resume.id}`);
    },
  });

  const setMasterMutation = trpc.resume.setMaster.useMutation({
    onSuccess: () => utils.resume.list.invalidate(),
  });

  const deleteMutation = trpc.resume.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      utils.resume.list.invalidate();
    },
  });

  function handleCreate() {
    createMutation.mutate({
      title: newTitle.trim() || "My Resume",
      format: "STRUCTURED",
    });
  }

  if (isLoading) return <ResumeListSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create and manage your resumes. Mark one as master to use for job matching.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Resume
        </Button>
      </div>

      {/* Resume grid */}
      {!resumes?.length ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Create your master resume to get started with job matching."
          action={{ label: "Create Resume", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="flex flex-col hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/resume/${resume.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <CardTitle className="text-base truncate">{resume.title}</CardTitle>
                  </div>
                  {/* Dropdown — stop propagation so card click doesn't fire */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/resume/${resume.id}`)}>
                          Edit
                        </DropdownMenuItem>
                        {!resume.isMaster && (
                          <DropdownMenuItem
                            onClick={() => setMasterMutation.mutate({ id: resume.id })}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set as master
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={resume.isMaster}
                          onClick={() => !resume.isMaster && setDeleteId(resume.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-2">
                <div className="flex flex-wrap gap-2">
                  {resume.isMaster && (
                    <Badge className="gap-1 text-xs">
                      <Star className="h-3 w-3" />
                      Master
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <FileType className="h-3 w-3" />
                    {FORMAT_LABELS[resume.format] ?? resume.format}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    v{resume.version}
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="pt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1.5" />
                Updated {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
              </CardFooter>
            </Card>
          ))}

          {/* Add new card */}
          <Card
            className="flex flex-col items-center justify-center p-8 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">New Resume</p>
          </Card>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resume</DialogTitle>
            <DialogDescription>
              Give your resume a name to get started. You can change it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="resume-title">Resume title</Label>
            <Input
              id="resume-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Senior Engineer Resume"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All content and version history will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
