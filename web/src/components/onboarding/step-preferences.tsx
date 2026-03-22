"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

const REMOTE_OPTIONS = [
  { value: "any", label: "Any (remote or on-site)" },
  { value: "remote", label: "Remote only" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site only" },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: "intern", label: "Intern / Student" },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior (5+ years)" },
] as const;

const COMPANY_SIZE_OPTIONS = [
  { value: "startup", label: "Startup (<50)" },
  { value: "small", label: "Small (50-200)" },
  { value: "mid", label: "Mid (200-1k)" },
  { value: "large", label: "Large (1k-10k)" },
  { value: "enterprise", label: "Enterprise (10k+)" },
];

const INDUSTRY_OPTIONS = [
  "tech",
  "fintech",
  "saas",
  "healthcare",
  "robotics",
  "ai/ml",
  "e-commerce",
  "edtech",
  "cybersecurity",
  "gaming",
];

export function StepPreferences({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { preferences, setPreferences } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const updatePreferences = trpc.settings.updatePreferences.useMutation();

  function addTag(
    field: "targetTitles" | "targetLocations" | "keywords",
    value: string,
    setter: (v: string) => void
  ) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = preferences[field];
    if (!current.includes(trimmed)) {
      setPreferences({ [field]: [...current, trimmed] });
    }
    setter("");
  }

  function removeTag(field: "targetTitles" | "targetLocations" | "keywords", value: string) {
    setPreferences({ [field]: preferences[field].filter((v) => v !== value) });
  }

  function toggleCompanySize(size: string) {
    const current = preferences.companySizes;
    const typed = size as "startup" | "small" | "mid" | "large" | "enterprise";
    setPreferences({
      companySizes: current.includes(typed) ? current.filter((s) => s !== typed) : [...current, typed],
    });
  }

  function toggleIndustry(ind: string) {
    const current = preferences.industries;
    setPreferences({
      industries: current.includes(ind) ? current.filter((i) => i !== ind) : [...current, ind],
    });
  }

  async function handleNext() {
    if (preferences.targetTitles.length === 0) {
      toast.error("Add at least one job title to search for");
      return;
    }
    setSaving(true);
    try {
      await updatePreferences.mutateAsync({
        targetTitles: preferences.targetTitles,
        targetLocations: preferences.targetLocations,
        remotePreference: preferences.remotePreference,
        salaryMin: preferences.salaryMin ? parseInt(preferences.salaryMin) : null,
        salaryMax: preferences.salaryMax ? parseInt(preferences.salaryMax) : null,
        companySizes: preferences.companySizes as (
          | "startup"
          | "small"
          | "mid"
          | "large"
          | "enterprise"
        )[],
        industries: preferences.industries,
        experienceLevel: preferences.experienceLevel,
        visaSponsorship: preferences.visaSponsorship,
        keywords: preferences.keywords,
      });
      onNext();
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What kind of jobs are you looking for?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This tells JobPilot exactly what to search for every day. Be as specific as possible —
          the more you fill in here, the more accurately it finds jobs that fit you.
        </p>
      </div>

      {/* Job Titles */}
      <div className="space-y-2">
        <Label>
          Job titles you&apos;re targeting{" "}
          <span className="text-destructive text-xs">*required</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Type a job title and press Enter or click +. Add multiple variations — e.g.
          &quot;Software Engineer&quot;, &quot;Backend Developer&quot;, &quot;Full Stack Engineer&quot;.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Software Engineer"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("targetTitles", titleInput, setTitleInput);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addTag("targetTitles", titleInput, setTitleInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-8">
          {preferences.targetTitles.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeTag("targetTitles", t)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <Label>Preferred locations</Label>
        <div className="flex gap-2">
          <Input
            placeholder='e.g. "Columbus, OH" or "Remote"'
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("targetLocations", locationInput, setLocationInput);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addTag("targetLocations", locationInput, setLocationInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-8">
          {preferences.targetLocations.map((l) => (
            <Badge key={l} variant="secondary" className="gap-1">
              {l}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeTag("targetLocations", l)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Remote + Experience */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Remote preference</Label>
          <Select
            value={preferences.remotePreference}
            onValueChange={(v) =>
              setPreferences({ remotePreference: v as typeof preferences.remotePreference })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMOTE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Experience level</Label>
          <Select
            value={preferences.experienceLevel}
            onValueChange={(v) =>
              setPreferences({ experienceLevel: v as typeof preferences.experienceLevel })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Salary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salary-min">Minimum salary (USD/yr)</Label>
          <Input
            id="salary-min"
            type="number"
            placeholder="e.g. 80000"
            value={preferences.salaryMin}
            onChange={(e) => setPreferences({ salaryMin: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary-max">Maximum salary (USD/yr)</Label>
          <Input
            id="salary-max"
            type="number"
            placeholder="e.g. 150000"
            value={preferences.salaryMax}
            onChange={(e) => setPreferences({ salaryMax: e.target.value })}
          />
        </div>
      </div>

      {/* Company Sizes */}
      <div className="space-y-2">
        <Label>Company size</Label>
        <div className="flex flex-wrap gap-2">
          {COMPANY_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleCompanySize(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                preferences.companySizes.includes(opt.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Industries */}
      <div className="space-y-2">
        <Label>Industries of interest</Label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => toggleIndustry(ind)}
              className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${
                preferences.industries.includes(ind)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label>Additional keywords</Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. TypeScript, Kubernetes"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag("keywords", keywordInput, setKeywordInput);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addTag("keywords", keywordInput, setKeywordInput)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-8">
          {preferences.keywords.map((k) => (
            <Badge key={k} variant="outline" className="gap-1">
              {k}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag("keywords", k)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Visa Sponsorship */}
      <div className="flex items-center gap-3 py-2">
        <Switch
          id="visa"
          checked={preferences.visaSponsorship}
          onCheckedChange={(v) => setPreferences({ visaSponsorship: v })}
        />
        <Label htmlFor="visa" className="cursor-pointer">
          I need visa sponsorship
        </Label>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
