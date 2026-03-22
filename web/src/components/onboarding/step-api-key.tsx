"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  DollarSign,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

const RESEARCH_MODELS = [
  { value: "claude-opus-4-6", label: "Claude Opus 4.6 (Best quality, ~$15/MTok)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Balanced, ~$3/MTok)" },
];

const EXECUTION_MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Recommended)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Fastest, cheapest)" },
];

const SEARCH_DEPTHS = [
  {
    value: "LIGHT",
    label: "Light",
    description: "Major job boards, exact title match",
    cost: "~$1–2/run",
  },
  {
    value: "STANDARD",
    label: "Standard",
    description: "Boards + web search, description analysis",
    cost: "~$3–5/run",
  },
  {
    value: "DEEP",
    label: "Deep",
    description: "Everything + company research + contacts",
    cost: "~$8–15/run",
  },
] as const;

const API_KEY_STEPS = [
  {
    step: 1,
    title: "Go to Anthropic Console",
    detail: "Open your browser and go to console.anthropic.com",
    highlight: "console.anthropic.com",
  },
  {
    step: 2,
    title: "Create a free account",
    detail: 'Click "Sign Up" and create an account with your email. If you already have one, just sign in.',
    highlight: null,
  },
  {
    step: 3,
    title: 'Click "API Keys" in the left sidebar',
    detail: 'Once logged in, look for "API Keys" in the left navigation menu and click it.',
    highlight: null,
  },
  {
    step: 4,
    title: 'Click "Create Key"',
    detail: 'Click the "Create Key" button. Give your key a name like "JobPilot" so you remember what it\'s for.',
    highlight: null,
  },
  {
    step: 5,
    title: "Copy your API key",
    detail: 'Your key will appear on screen — it starts with "sk-ant-". Copy it immediately. You won\'t be able to see it again!',
    highlight: "sk-ant-",
  },
  {
    step: 6,
    title: "Paste it in the field below",
    detail: "Paste your copied key into the field below and click Validate.",
    highlight: null,
  },
];

type ValidationState = "idle" | "validating" | "valid" | "invalid";

export function StepApiKey({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { apiKey: apiKeyData, setApiKeyData } = useOnboardingStore();
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [showGuide, setShowGuide] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const setApiKey = trpc.settings.setApiKey.useMutation();
  const validateApiKey = trpc.settings.validateApiKey.useMutation();
  const updateApiConfig = trpc.settings.updateApiConfig.useMutation();

  async function handleValidate() {
    if (!apiKeyData.apiKey.startsWith("sk-ant-")) {
      toast.error("API key must start with sk-ant-");
      return;
    }
    setValidationState("validating");
    try {
      await setApiKey.mutateAsync({ apiKey: apiKeyData.apiKey });
      const result = await validateApiKey.mutateAsync();
      if (result.valid) {
        setValidationState("valid");
        toast.success("API key is valid!");
      } else {
        setValidationState("invalid");
        toast.error(result.error ?? "API key validation failed");
      }
    } catch {
      setValidationState("invalid");
      toast.error("Failed to validate API key");
    }
  }

  async function handleNext() {
    if (!apiKeyData.apiKey) {
      toast.error("Please enter your Claude API key");
      return;
    }
    if (!apiKeyData.apiKey.startsWith("sk-ant-")) {
      toast.error("API key must start with sk-ant-");
      return;
    }
    setSaving(true);
    try {
      if (validationState !== "valid") {
        await setApiKey.mutateAsync({ apiKey: apiKeyData.apiKey });
      }
      await updateApiConfig.mutateAsync({
        researchModel: apiKeyData.researchModel as
          | "claude-opus-4-6"
          | "claude-sonnet-4-6"
          | "claude-haiku-4-5-20251001",
        executionModel: apiKeyData.executionModel as
          | "claude-opus-4-6"
          | "claude-sonnet-4-6"
          | "claude-haiku-4-5-20251001",
        searchDepth: apiKeyData.searchDepth,
        dailySearchEnabled: apiKeyData.dailySearchEnabled,
        maxDailyApiCost: apiKeyData.maxDailyApiCost,
      });
      onNext();
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connect your Claude AI key</h2>
        <p className="text-sm text-muted-foreground mt-1">
          JobPilot uses Claude AI to search for jobs, analyze matches, and research companies on
          your behalf. You use your own API key — so you pay only for what you use, with no
          markup.
        </p>
      </div>

      {/* What is this / Why */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Zap,
            title: "Powers AI search",
            desc: "Claude finds jobs matching your profile daily",
          },
          {
            icon: DollarSign,
            title: "Pay only what you use",
            desc: "Typical cost: $3–10/month for daily searches",
          },
          {
            icon: Lock,
            title: "Stored securely",
            desc: "Encrypted with AES-256. We never see it in plaintext",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-lg border bg-muted/20 p-3 text-center space-y-1">
            <Icon className="h-5 w-5 mx-auto text-primary" />
            <p className="text-xs font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Step-by-step guide */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors rounded-lg"
        >
          <span className="flex items-center gap-2">
            <span className="text-base">📋</span>
            How to get your Claude API key — step by step
          </span>
          {showGuide ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showGuide && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            {API_KEY_STEPS.map(({ step, title, detail, highlight }) => (
              <div key={step} className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {detail.split(highlight ?? "|||").map((part, i) =>
                      i === 0 || !highlight ? (
                        part
                      ) : (
                        <span key={i}>
                          <span className="font-mono bg-muted px-1 rounded text-foreground">
                            {highlight}
                          </span>
                          {part}
                        </span>
                      )
                    )}
                  </p>
                </div>
              </div>
            ))}

            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
            >
              Open Anthropic Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* API Key Input */}
      <div className="space-y-2">
        <Label htmlFor="api-key">
          Your Claude API Key <span className="text-destructive text-xs">*required</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-api03-..."
              value={apiKeyData.apiKey}
              onChange={(e) => {
                setApiKeyData({ apiKey: e.target.value });
                setValidationState("idle");
              }}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleValidate}
            disabled={!apiKeyData.apiKey || validationState === "validating"}
            className="shrink-0"
          >
            {validationState === "validating" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Checking...</>
            ) : validationState === "valid" ? (
              <><CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Valid</>
            ) : validationState === "invalid" ? (
              <><XCircle className="h-4 w-4 text-destructive mr-1" /> Invalid</>
            ) : (
              "Validate"
            )}
          </Button>
        </div>
        {validationState === "valid" && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Key verified and will be stored encrypted
          </p>
        )}
        {validationState === "invalid" && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Key didn&apos;t work — double-check it and try again
          </p>
        )}
        {!apiKeyData.apiKey && (
          <p className="text-xs text-muted-foreground">
            Your key starts with <span className="font-mono bg-muted px-1 rounded">sk-ant-</span>
          </p>
        )}
        {apiKeyData.apiKey && validationState === "idle" && (
          <p className="text-xs text-muted-foreground">
            Stored with AES-256 encryption. We never see your key in plaintext.
          </p>
        )}
      </div>

      {/* Search Depth — simplified, most important setting */}
      <div className="space-y-3">
        <div>
          <Label>How deeply should JobPilot search?</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            This affects how many jobs are found per run and the AI cost per search.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SEARCH_DEPTHS.map((depth) => (
            <button
              key={depth.value}
              type="button"
              onClick={() => setApiKeyData({ searchDepth: depth.value })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                apiKeyData.searchDepth === depth.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{depth.label}</span>
                <Badge variant="outline" className="text-xs">
                  {depth.cost}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{depth.description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended for most users: <strong>Standard</strong>. You can change this anytime in
          Settings.
        </p>
      </div>

      {/* Daily automated search toggle */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            id="daily-search"
            checked={apiKeyData.dailySearchEnabled}
            onCheckedChange={(v) => setApiKeyData({ dailySearchEnabled: v })}
          />
          <div>
            <Label htmlFor="daily-search" className="cursor-pointer">
              Run automated job search every day
            </Label>
            <p className="text-xs text-muted-foreground">
              JobPilot will search for new matching jobs automatically each morning.
            </p>
          </div>
        </div>

        {apiKeyData.dailySearchEnabled && (
          <div className="space-y-4 pt-1 border-t mt-3">
            <div className="space-y-2">
              <Label htmlFor="search-time">Search time each day</Label>
              <Input
                id="search-time"
                type="time"
                value={apiKeyData.searchTime}
                onChange={(e) => setApiKeyData({ searchTime: e.target.value })}
                className="w-36"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily-cost">Daily spending limit</Label>
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="daily-cost"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={apiKeyData.maxDailyApiCost}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setApiKeyData({ maxDailyApiCost: val });
                      }
                    }}
                    className="pl-7"
                  />
                </div>
                <span className="text-sm text-muted-foreground">/day</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Searches stop automatically if this daily limit is reached. Recommended: $5–15/day.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced model settings (collapsed by default) */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-lg"
        >
          <span>Advanced: AI model selection</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 border-t pt-3 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Research model</Label>
              <Select
                value={apiKeyData.researchModel}
                onValueChange={(v) => v && setApiKeyData({ researchModel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for job search & company research</p>
            </div>
            <div className="space-y-2">
              <Label>Execution model</Label>
              <Select
                value={apiKeyData.executionModel}
                onValueChange={(v) => v && setApiKeyData({ executionModel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXECUTION_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for match analysis & email scanning
              </p>
            </div>
          </div>
        )}
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
