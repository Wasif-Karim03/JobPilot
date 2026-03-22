"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  DollarSign,
  Clock,
  Bookmark,
  FileText,
  Send,
  Building2,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MatchScore } from "@/components/jobs/match-score";
import { CompanyIntel } from "@/components/jobs/company-intel";
import { TrackApplicationDialog } from "@/components/applications/track-application-dialog";
import { JobDetailSkeleton } from "@/components/shared/loading";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

type CompanyInfo = {
  size?: string;
  industry?: string;
  description?: string;
  founded?: string;
  headquarters?: string;
};

type MatchAnalysis = {
  titleMatch?: number;
  skillsMatch?: number;
  experienceMatch?: number;
  details?: string;
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [notesValue, setNotesValue] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);

  const { data: job, isLoading, error } = trpc.job.getById.useQuery({ id });
  const updateStatus = trpc.job.updateStatus.useMutation();
  const updateNotes = trpc.job.updateNotes.useMutation();
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <JobDetailSkeleton />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="mt-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Job not found or failed to load.</p>
        </div>
      </div>
    );
  }

  const currentNotes = notesValue ?? job.userNotes ?? "";
  const matchAnalysis = job.matchAnalysis as MatchAnalysis | null;
  const companyInfo = job.companyInfo as CompanyInfo | null;
  const hasApplication = !!job.application;
  const isHighMatch = (job.matchScore ?? 0) >= 80;

  async function handleBookmark() {
    try {
      await updateStatus.mutateAsync({ id: job!.id, status: "BOOKMARKED" });
      utils.job.getById.invalidate({ id });
      toast.success("Bookmarked");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function saveNotes() {
    if (notesValue === null) return;
    setSavingNotes(true);
    try {
      await updateNotes.mutateAsync({ id: job!.id, notes: notesValue });
      utils.job.getById.invalidate({ id });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-start justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 -ml-2 shrink-0">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {job.status === "DISCOVERED" && (
            <Button size="sm" variant="outline" onClick={handleBookmark} className="gap-1.5">
              <Bookmark className="h-4 w-4" />
              Bookmark
            </Button>
          )}
          {!hasApplication && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTrackDialogOpen(true)}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              I Applied
            </Button>
          )}
          {hasApplication && (
            <Badge variant="outline" className="h-9 px-3 gap-1.5 text-green-600 border-green-300">
              <CheckCircle2 className="h-4 w-4" /> Tracking
            </Badge>
          )}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium border rounded-md bg-background hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open listing
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
          <p className="text-lg text-muted-foreground">{job.company}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                {job.salaryRange}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(job.discoveredAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <MatchScore score={job.matchScore} size="lg" showLabel />
      </div>

      {/* Match analysis summary */}
      {job.matchScore != null && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Title", value: matchAnalysis?.titleMatch },
            { label: "Skills", value: matchAnalysis?.skillsMatch },
            { label: "Experience", value: matchAnalysis?.experienceMatch },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{label} match</p>
              <p className="text-xl font-bold mt-1">
                {value != null ? `${Math.round(value)}%` : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Missing keywords */}
      {job.missingKeywords.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-500" />
            <h3 className="font-medium text-sm">Missing Keywords</h3>
            <span className="text-xs text-muted-foreground">
              Add these to your resume to improve match score
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.missingKeywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-amber-600 border-amber-300">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="company">
            Company
            {isHighMatch && job.contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
                {job.contacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Description */}
        <TabsContent value="description" className="mt-4">
          {job.description ? (
            <div className="rounded-lg border p-5 prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {job.description}
              </pre>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Full description not available. View the original listing.
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center h-9 px-3 text-sm font-medium border rounded-md bg-background hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Open listing
              </a>
            </div>
          )}
        </TabsContent>

        {/* Company + Contacts */}
        <TabsContent value="company" className="mt-4">
          <CompanyIntel
            contacts={job.contacts as Parameters<typeof CompanyIntel>[0]["contacts"]}
            companyInfo={companyInfo}
            company={job.company}
          />
          {!isHighMatch && job.contacts.length === 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Company research runs automatically for jobs with 80%+ match scores.
                This job&apos;s current score is{" "}
                {job.matchScore != null ? `${Math.round(job.matchScore)}%` : "unknown"}.
              </span>
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4 space-y-3">
          <Textarea
            placeholder="Add personal notes about this job, interview prep, contacts to reach out to..."
            rows={8}
            value={currentNotes}
            onChange={(e) => setNotesValue(e.target.value)}
          />
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={savingNotes || notesValue === null}
            className="gap-2"
          >
            {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save notes
          </Button>
        </TabsContent>
      </Tabs>

      {/* Match suggestions */}
      {matchAnalysis?.details && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{matchAnalysis.details}</p>
        </div>
      )}

      {/* Track application dialog */}
      <TrackApplicationDialog
        open={trackDialogOpen}
        onOpenChange={setTrackDialogOpen}
        jobId={job.id}
        jobTitle={job.title}
        company={job.company}
        onSuccess={() => {
          utils.job.getById.invalidate({ id });
          toast.success("Application tracked!");
        }}
      />
    </div>
  );
}
