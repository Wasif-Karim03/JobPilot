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
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
  Building2,
  Globe,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  matchedKeywords?: string[];
  missingKeywords?: string[];
  details?: string;
};

const SOURCE_LABELS: Record<string, string> = {
  "remotive": "Remotive",
  "the-muse": "The Muse",
  "jobicy": "Jobicy",
  "web_search": "Web Search",
};

function ScoreBar({ label, value, color }: { label: string; value?: number; color: string }) {
  if (value == null) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${color}`}>{Math.round(value)}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

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

  // Keywords from matchAnalysis (preferred) or missingKeywords field
  const matchedKeywords = matchAnalysis?.matchedKeywords ?? [];
  const missingKeywords = matchAnalysis?.missingKeywords ?? job.missingKeywords ?? [];

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

  const scoreColor =
    (job.matchScore ?? 0) >= 75 ? "text-green-600" :
    (job.matchScore ?? 0) >= 50 ? "text-amber-600" : "text-muted-foreground";

  return (
    <div className="max-w-4xl space-y-5">
      {/* Back + actions */}
      <div className="flex items-start justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 -ml-2 shrink-0">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {job.status === "DISCOVERED" && (
            <Button size="sm" variant="outline" onClick={handleBookmark} className="gap-1.5">
              <Bookmark className="h-4 w-4" /> Bookmark
            </Button>
          )}
          {!hasApplication && (
            <Button size="sm" variant="outline" onClick={() => setTrackDialogOpen(true)} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> I Applied
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
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Apply Now
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
          <p className="text-lg text-muted-foreground font-medium">{job.company}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            {job.salaryRange && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                {job.salaryRange}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(job.discoveredAt), { addSuffix: true })}
            </span>
            {job.source && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {SOURCE_LABELS[job.source] ?? job.source}
              </span>
            )}
          </div>
        </div>
        <MatchScore score={job.matchScore} size="lg" showLabel />
      </div>

      {/* Match Breakdown */}
      {job.matchScore != null && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Match Breakdown</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <ScoreBar
              label="Title Match"
              value={matchAnalysis?.titleMatch}
              color={(matchAnalysis?.titleMatch ?? 0) >= 70 ? "text-green-600" : (matchAnalysis?.titleMatch ?? 0) >= 40 ? "text-amber-600" : "text-red-500"}
            />
            <ScoreBar
              label="Skills Match"
              value={matchAnalysis?.skillsMatch}
              color={(matchAnalysis?.skillsMatch ?? 0) >= 70 ? "text-green-600" : (matchAnalysis?.skillsMatch ?? 0) >= 40 ? "text-amber-600" : "text-red-500"}
            />
            <ScoreBar
              label="Experience Match"
              value={matchAnalysis?.experienceMatch}
              color={(matchAnalysis?.experienceMatch ?? 0) >= 70 ? "text-green-600" : (matchAnalysis?.experienceMatch ?? 0) >= 40 ? "text-amber-600" : "text-red-500"}
            />
          </div>
          {matchAnalysis?.details && (
            <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
              {matchAnalysis.details}
            </p>
          )}
        </div>
      )}

      {/* Keyword match */}
      {(matchedKeywords.length > 0 || missingKeywords.length > 0) && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Keyword Analysis</h3>
          </div>

          {matchedKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Your resume has ({matchedKeywords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {missingKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Missing from your resume ({missingKeywords.length}) — add these to improve match score
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Full Description
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
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
            <div className="rounded-xl border bg-card p-5 space-y-4">
              {/* Quick info bar */}
              <div className="flex flex-wrap gap-3 text-sm pb-4 border-b">
                {job.location && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                )}
                {job.salaryRange && (
                  <span className="flex items-center gap-1.5 text-green-600 font-medium">
                    <DollarSign className="h-3.5 w-3.5" /> {job.salaryRange}
                  </span>
                )}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline font-medium ml-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View original listing
                </a>
              </div>

              {/* Description body */}
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
                {job.description}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Full description not available from this source.
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-9 px-3 text-sm font-medium border rounded-md bg-background hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> Open listing
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
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground rounded-lg border p-3">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Company research (contacts, hiring managers) runs for 80%+ match jobs.
                Current score: {job.matchScore != null ? `${Math.round(job.matchScore)}%` : "unknown"}.
              </span>
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4 space-y-3">
          <Textarea
            placeholder="Add personal notes — interview prep, contacts to reach, things to research before applying..."
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

      {/* Apply CTA */}
      <div className="rounded-xl border bg-muted/40 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Ready to apply?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open the original listing and submit your application. Track it here after.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> Apply Now
          </a>
          {!hasApplication && (
            <Button size="sm" variant="outline" onClick={() => setTrackDialogOpen(true)} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Track
            </Button>
          )}
        </div>
      </div>

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
