"use client";

import { useState } from "react";
import { CheckCircle2, FileText, SlidersHorizontal, Key, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

interface ReviewSectionProps {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function ReviewSection({ icon, title, onEdit, children }: ReviewSectionProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 text-xs gap-1 text-muted-foreground"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function StepReview({
  onComplete,
  onGoToStep,
}: {
  onComplete: () => void;
  onGoToStep: (step: number) => void;
}) {
  const { resume, preferences, apiKey, gmailConnected, savedResumeId } = useOnboardingStore();
  const [completing, setCompleting] = useState(false);

  const completeOnboarding = trpc.user.completeOnboarding.useMutation();

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeOnboarding.mutateAsync();
      toast.success("Welcome to JobPilot! Your setup is complete.");
      onComplete();
    } catch {
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setCompleting(false);
    }
  }

  const resumeMethod = resume.method;
  const resumeDisplay =
    resumeMethod === "paste"
      ? `Pasted text (${resume.pastedText.length} chars)`
      : resumeMethod === "structured"
        ? resume.contactInfo.name
          ? `Structured form — ${resume.contactInfo.name}`
          : "Structured form"
        : "Not entered";

  const apiKeyDisplay = apiKey.apiKey
    ? `sk-ant-...${apiKey.apiKey.slice(-4)}`
    : "Not set";

  const searchDepthLabel = {
    LIGHT: "Light (~$1–2/run)",
    STANDARD: "Standard (~$3–5/run)",
    DEEP: "Deep (~$8–15/run)",
  }[apiKey.searchDepth];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review your setup</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Everything looks good? Complete setup to start your first job search.
        </p>
      </div>

      <div className="space-y-3">
        {/* Resume */}
        <ReviewSection
          icon={<FileText className="h-4 w-4 text-blue-500" />}
          title="Master Resume"
          onEdit={() => onGoToStep(1)}
        >
          <ReviewRow label="Method" value={resumeDisplay || "Not set"} />
          {savedResumeId && (
            <ReviewRow
              label="Status"
              value={
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
                </Badge>
              }
            />
          )}
        </ReviewSection>

        {/* Preferences */}
        <ReviewSection
          icon={<SlidersHorizontal className="h-4 w-4 text-purple-500" />}
          title="Job Preferences"
          onEdit={() => onGoToStep(2)}
        >
          <ReviewRow
            label="Titles"
            value={
              preferences.targetTitles.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {preferences.targetTitles.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                  {preferences.targetTitles.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{preferences.targetTitles.length - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">None set</span>
              )
            }
          />
          <ReviewRow
            label="Locations"
            value={
              preferences.targetLocations.length > 0
                ? preferences.targetLocations.slice(0, 2).join(", ")
                : "Any"
            }
          />
          <ReviewRow label="Remote" value={preferences.remotePreference} />
          <ReviewRow label="Experience" value={preferences.experienceLevel} />
          {(preferences.salaryMin || preferences.salaryMax) && (
            <ReviewRow
              label="Salary"
              value={
                preferences.salaryMin && preferences.salaryMax
                  ? `$${parseInt(preferences.salaryMin).toLocaleString()} – $${parseInt(preferences.salaryMax).toLocaleString()}`
                  : preferences.salaryMin
                    ? `$${parseInt(preferences.salaryMin).toLocaleString()}+`
                    : `Up to $${parseInt(preferences.salaryMax!).toLocaleString()}`
              }
            />
          )}
          {preferences.visaSponsorship && (
            <ReviewRow label="Visa" value="Sponsorship required" />
          )}
        </ReviewSection>

        {/* API Key */}
        <ReviewSection
          icon={<Key className="h-4 w-4 text-amber-500" />}
          title="Claude API Configuration"
          onEdit={() => onGoToStep(3)}
        >
          <ReviewRow label="API Key" value={apiKeyDisplay} />
          <ReviewRow label="Research" value={apiKey.researchModel} />
          <ReviewRow label="Execution" value={apiKey.executionModel} />
          <ReviewRow label="Search depth" value={searchDepthLabel} />
          <ReviewRow
            label="Daily search"
            value={
              apiKey.dailySearchEnabled
                ? `Enabled at ${apiKey.searchTime}`
                : "Disabled"
            }
          />
          {apiKey.dailySearchEnabled && (
            <ReviewRow label="Max daily cost" value={`$${apiKey.maxDailyApiCost}/day`} />
          )}
        </ReviewSection>

        {/* Gmail */}
        <ReviewSection
          icon={<Mail className="h-4 w-4 text-red-500" />}
          title="Gmail Integration"
          onEdit={() => onGoToStep(4)}
        >
          <ReviewRow
            label="Status"
            value={
              gmailConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">Not connected</span>
              )
            }
          />
          {!gmailConnected && (
            <p className="text-xs text-muted-foreground">
              You can connect Gmail later from Settings to enable automatic status tracking.
            </p>
          )}
        </ReviewSection>
      </div>

      <Button
        onClick={handleComplete}
        disabled={completing || !apiKey.apiKey}
        className="w-full"
        size="lg"
      >
        {completing ? "Setting up..." : "Complete Setup & Go to Dashboard"}
      </Button>

      {!apiKey.apiKey && (
        <p className="text-xs text-center text-destructive">
          You must enter a Claude API key before completing setup.
        </p>
      )}
    </div>
  );
}
