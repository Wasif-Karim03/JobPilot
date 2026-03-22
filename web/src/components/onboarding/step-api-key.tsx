"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
      // Save the key first
      await setApiKey.mutateAsync({ apiKey: apiKeyData.apiKey });
      // Then validate it
      const result = await validateApiKey.mutateAsync();
      if (result.valid) {
        setValidationState("valid");
        toast.success("API key is valid");
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
      // Save key if not already saved
      if (validationState !== "valid") {
        await setApiKey.mutateAsync({ apiKey: apiKeyData.apiKey });
      }
      // Save config
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

  const maskedKey =
    apiKeyData.apiKey.length > 8
      ? `sk-ant-...${apiKeyData.apiKey.slice(-4)}`
      : apiKeyData.apiKey;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configure your Claude API key</h2>
        <p className="text-sm text-muted-foreground mt-1">
          JobPilot uses your own API key — you control your costs. Get one at{" "}
          <span className="text-foreground font-medium">console.anthropic.com</span>.
        </p>
      </div>

      {/* API Key Input */}
      <div className="space-y-2">
        <Label htmlFor="api-key">
          Claude API Key <span className="text-muted-foreground text-xs">(required)</span>
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
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={!apiKeyData.apiKey || validationState === "validating"}
            className="shrink-0"
          >
            {validationState === "validating" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : validationState === "valid" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : validationState === "invalid" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              "Validate"
            )}
          </Button>
        </div>
        {validationState === "valid" && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Key verified — stored encrypted
          </p>
        )}
        {validationState === "invalid" && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Invalid key — check and try again
          </p>
        )}
        {apiKeyData.apiKey && validationState === "idle" && (
          <p className="text-xs text-muted-foreground">
            Stored encrypted (AES-256). We never see your key in plaintext.
          </p>
        )}
      </div>

      {/* Models */}
      <div className="grid grid-cols-2 gap-4">
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
          <p className="text-xs text-muted-foreground">Used for match analysis & email scanning</p>
        </div>
      </div>

      {/* Search Depth */}
      <div className="space-y-3">
        <Label>Search depth</Label>
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
      </div>

      {/* Daily Settings */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <Switch
            id="daily-search"
            checked={apiKeyData.dailySearchEnabled}
            onCheckedChange={(v) => setApiKeyData({ dailySearchEnabled: v })}
          />
          <Label htmlFor="daily-search" className="cursor-pointer">
            Enable daily automated search
          </Label>
        </div>

        {apiKeyData.dailySearchEnabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-time">Daily search time</Label>
                <Input
                  id="search-time"
                  type="time"
                  value={apiKeyData.searchTime}
                  onChange={(e) => setApiKeyData({ searchTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max daily API cost</Label>
                <span className="text-sm font-medium">${apiKeyData.maxDailyApiCost}/day</span>
              </div>
              <Slider
                min={1}
                max={50}
                step={1}
                value={[apiKeyData.maxDailyApiCost]}
                onValueChange={(vals) => setApiKeyData({ maxDailyApiCost: (vals as number[])[0] })}
              />
              <p className="text-xs text-muted-foreground">
                Searches stop if this cost is exceeded in a day. Recommended: $5–15.
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
