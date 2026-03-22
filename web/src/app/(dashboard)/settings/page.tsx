"use client";

import { useState } from "react";
import {
  Key,
  Brain,
  Search,
  Mail,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────
// API KEY SECTION
// ─────────────────────────────────────────────────────────
function ApiKeySection() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState<{ valid: boolean; error?: string } | null>(null);

  const { data: config, refetch } = trpc.settings.getApiConfig.useQuery();
  const setApiKeyMutation = trpc.settings.setApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key saved");
      setApiKey("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const validateMutation = trpc.settings.validateApiKey.useMutation({
    onSuccess: (result) => setValidResult(result),
    onError: () => setValidResult({ valid: false, error: "Validation failed" }),
    onSettled: () => setValidating(false),
  });

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setApiKeyMutation.mutate({ apiKey: apiKey.trim() });
  };

  const handleValidate = () => {
    setValidating(true);
    setValidResult(null);
    validateMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="h-4 w-4" />
          Claude API Key
        </CardTitle>
        <CardDescription>
          Your Anthropic API key is encrypted and stored securely. You pay for your own usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {config?.hasApiKey ? (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
              <CheckCircle className="h-3 w-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-200 gap-1">
              <XCircle className="h-3 w-3" />
              Not set
            </Badge>
          )}
          {config?.hasApiKey && (
            <Button variant="ghost" size="sm" onClick={handleValidate} disabled={validating}>
              {validating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Validate
            </Button>
          )}
        </div>

        {validResult && (
          <div
            className={`text-sm px-3 py-2 rounded flex items-center gap-2 ${
              validResult.valid
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {validResult.valid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {validResult.valid ? "API key is valid" : validResult.error ?? "Invalid key"}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="api-key">
            {config?.hasApiKey ? "Replace API Key" : "Enter API Key"}
          </Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? "text" : "password"}
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey((s) => !s)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your key at console.anthropic.com
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={!apiKey.trim() || setApiKeyMutation.isPending}
        >
          {setApiKeyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save API Key
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// AI CONFIG SECTION
// ─────────────────────────────────────────────────────────
function AiConfigSection() {
  const { data: config, isLoading } = trpc.settings.getApiConfig.useQuery();
  const updateConfig = trpc.settings.updateApiConfig.useMutation({
    onSuccess: () => toast.success("AI settings saved"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    researchModel: "",
    executionModel: "",
    searchDepth: "",
    dailySearchEnabled: true,
    maxDailyApiCost: 10,
  });

  // Sync form when data loads
  useState(() => {
    if (config) {
      setForm({
        researchModel: config.researchModel,
        executionModel: config.executionModel,
        searchDepth: config.searchDepth,
        dailySearchEnabled: config.dailySearchEnabled,
        maxDailyApiCost: config.maxDailyApiCost,
      });
    }
  });

  const handleSave = () => {
    updateConfig.mutate({
      researchModel: (form.researchModel || undefined) as "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" | undefined,
      executionModel: (form.executionModel || undefined) as "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" | undefined,
      searchDepth: (form.searchDepth || undefined) as "LIGHT" | "STANDARD" | "DEEP" | undefined,
      dailySearchEnabled: form.dailySearchEnabled,
      maxDailyApiCost: form.maxDailyApiCost,
    });
  };

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const searchDepth = form.searchDepth || config?.searchDepth || "STANDARD";
  const costMap: Record<string, string> = {
    LIGHT: "~$1–2 / search",
    STANDARD: "~$3–5 / search",
    DEEP: "~$8–15 / search",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Configuration
        </CardTitle>
        <CardDescription>Configure models and search depth.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Research Model</Label>
            <Select
              value={form.researchModel || config?.researchModel}
              onValueChange={(v) => setForm((f) => ({ ...f, researchModel: v ?? f.researchModel }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-opus-4-6">claude-opus-4-6 (Best)</SelectItem>
                <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6 (Faster)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for company research & deep analysis</p>
          </div>
          <div className="space-y-2">
            <Label>Execution Model</Label>
            <Select
              value={form.executionModel || config?.executionModel}
              onValueChange={(v) => setForm((f) => ({ ...f, executionModel: v ?? f.executionModel }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6 (Recommended)</SelectItem>
                <SelectItem value="claude-haiku-4-5-20251001">claude-haiku-4-5 (Cheapest)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for job search & email scanning</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Search Depth</Label>
          <Select
            value={searchDepth}
            onValueChange={(v) => setForm((f) => ({ ...f, searchDepth: v ?? f.searchDepth }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIGHT">Light — Major boards only ({costMap.LIGHT})</SelectItem>
              <SelectItem value="STANDARD">Standard — Boards + description analysis ({costMap.STANDARD})</SelectItem>
              <SelectItem value="DEEP">Deep — Everything + contacts + alumni ({costMap.DEEP})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Daily Search</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically search for jobs daily</p>
          </div>
          <Switch
            checked={form.dailySearchEnabled ?? config?.dailySearchEnabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, dailySearchEnabled: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Max Daily API Cost ($)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={form.maxDailyApiCost ?? config?.maxDailyApiCost}
            onChange={(e) => setForm((f) => ({ ...f, maxDailyApiCost: parseFloat(e.target.value) }))}
            className="max-w-32"
          />
          <p className="text-xs text-muted-foreground">Searches stop when this limit is reached</p>
        </div>

        <Button onClick={handleSave} disabled={updateConfig.isPending || !config?.hasApiKey}>
          {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save AI Settings
        </Button>
        {!config?.hasApiKey && (
          <p className="text-xs text-amber-600">Set your API key first</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// PREFERENCES SECTION
// ─────────────────────────────────────────────────────────
function PreferencesSection() {
  const { data: prefs, isLoading } = trpc.settings.getPreferences.useQuery();
  const updatePrefs = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => toast.success("Preferences saved"),
    onError: (e) => toast.error(e.message),
  });

  const [titlesInput, setTitlesInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const handleSave = () => {
    const titles = titlesInput
      ? titlesInput.split(",").map((s) => s.trim()).filter(Boolean)
      : prefs?.targetTitles ?? [];
    const locations = locationsInput
      ? locationsInput.split(",").map((s) => s.trim()).filter(Boolean)
      : prefs?.targetLocations ?? [];

    updatePrefs.mutate({
      targetTitles: titles,
      targetLocations: locations,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          Job Preferences
        </CardTitle>
        <CardDescription>Control what jobs are found for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Target Job Titles</Label>
          <Input
            placeholder={prefs?.targetTitles.join(", ") || "e.g. Software Engineer, Backend Engineer"}
            value={titlesInput}
            onChange={(e) => setTitlesInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Comma-separated. Current: {prefs?.targetTitles.join(", ") || "none"}</p>
        </div>
        <div className="space-y-2">
          <Label>Preferred Locations</Label>
          <Input
            placeholder={prefs?.targetLocations.join(", ") || "e.g. Remote, San Francisco, CA"}
            value={locationsInput}
            onChange={(e) => setLocationsInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Current: {prefs?.targetLocations.join(", ") || "none"}</p>
        </div>

        {prefs && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span>Experience: <strong>{prefs.experienceLevel}</strong></span>
            <span>Remote: <strong>{prefs.remotePreference}</strong></span>
            {prefs.salaryMin && <span>Min salary: <strong>${prefs.salaryMin.toLocaleString()}</strong></span>}
            <span>Search time: <strong>{prefs.searchTime}</strong></span>
          </div>
        )}

        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Preferences
        </Button>
        <p className="text-xs text-muted-foreground">
          For full preference editing, complete the onboarding flow again.
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// GMAIL SECTION
// ─────────────────────────────────────────────────────────
function GmailSection() {
  const { data: status, refetch } = trpc.settings.getGmailStatus.useQuery();
  const disconnect = trpc.gmail.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Gmail disconnected");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const triggerScan = trpc.gmail.triggerScan.useMutation({
    onSuccess: () => toast.success("Email scan queued"),
    onError: (e) => toast.error(e.message),
  });
  const initOAuth = trpc.gmail.initiateOAuth.useMutation({
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl;
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Gmail Connection
        </CardTitle>
        <CardDescription>
          Connect Gmail to auto-track application status from emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {status?.connected ? "Connected" : "Not connected"}
            </p>
            {status?.email && (
              <p className="text-xs text-muted-foreground">{status.email}</p>
            )}
            {status?.lastScanAt && (
              <p className="text-xs text-muted-foreground">
                Last scan: {new Date(status.lastScanAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerScan.mutate()}
                disabled={triggerScan.isPending}
              >
                {triggerScan.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Scan Now
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => initOAuth.mutate()}
              disabled={initOAuth.isPending}
            >
              {initOAuth.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Connect Gmail
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// ACCOUNT SECTION
// ─────────────────────────────────────────────────────────
function AccountSection() {
  const { data: profile } = trpc.user.getProfile.useQuery();
  const [name, setName] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => toast.success("Profile updated"),
    onError: (e) => toast.error(e.message),
  });
  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted");
      window.location.href = "/";
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Account
        </CardTitle>
        <CardDescription>Manage your profile and account settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Display Name</Label>
          <div className="flex gap-2">
            <Input
              placeholder={profile?.name ?? "Your name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => updateProfile.mutate({ name: name.trim() })}
              disabled={!name.trim() || updateProfile.isPending}
            >
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{profile?.email ?? "—"}</p>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
            <Shield className="h-4 w-4" />
            Danger Zone
          </div>
          {!showDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setShowDelete(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3 border border-destructive rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your data. Type your email to confirm.
              </p>
              <Input
                placeholder={profile?.email}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    confirmEmail !== profile?.email || deleteAccount.isPending
                  }
                  onClick={() => deleteAccount.mutate({ confirmEmail })}
                >
                  {deleteAccount.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Delete Everything
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDelete(false);
                    setConfirmEmail("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ApiKeySection />
      <AiConfigSection />
      <PreferencesSection />
      <GmailSection />
      <AccountSection />
    </div>
  );
}
