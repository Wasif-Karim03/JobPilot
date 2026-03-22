"use client";

import { useState } from "react";
import { Mail, CheckCircle2, ExternalLink, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

export function StepGmail({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { gmailConnected, setGmailConnected } = useOnboardingStore();
  const [connecting, setConnecting] = useState(false);

  const getConnectionStatus = trpc.gmail.getConnectionStatus.useQuery();
  const initiateOAuth = trpc.gmail.initiateOAuth.useMutation();
  const disconnect = trpc.gmail.disconnect.useMutation();

  const isConnected = gmailConnected || !!getConnectionStatus.data?.connected;
  const connectedEmail = getConnectionStatus.data?.email;

  async function handleConnect() {
    setConnecting(true);
    try {
      const { authUrl } = await initiateOAuth.mutateAsync();
      // Open OAuth flow in new tab
      const popup = window.open(authUrl, "gmail-oauth", "width=600,height=700");

      // Poll for completion
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnecting(false);
          // Refresh connection status
          getConnectionStatus.refetch().then((res) => {
            if (res.data?.connected) {
              setGmailConnected(true);
              toast.success("Gmail connected successfully");
            }
          });
        }
      }, 500);
    } catch {
      toast.error("Failed to initiate Gmail connection");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync();
      setGmailConnected(false);
      toast.success("Gmail disconnected");
      getConnectionStatus.refetch();
    } catch {
      toast.error("Failed to disconnect Gmail");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connect Gmail for auto-tracking</h2>
        <p className="text-sm text-muted-foreground mt-1">
          JobPilot can scan your inbox for application updates — rejections, interviews, offers —
          and automatically update your tracker.
        </p>
      </div>

      {/* Benefits */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">What this enables:</p>
        <ul className="space-y-2">
          {[
            "Auto-detect rejection emails and mark applications as rejected",
            "Capture interview invitations and add dates to your tracker",
            "Detect offer letters and celebrate your wins",
            "Link emails to specific applications by company name",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
        <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Read-only access only
          </p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
            We only request <strong>gmail.readonly</strong> scope. We can never send emails, delete
            messages, or access anything other than reading. You can revoke access at any time.
          </p>
        </div>
      </div>

      {/* Connection status */}
      {isConnected ? (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Gmail connected
              </p>
              {connectedEmail && (
                <p className="text-xs text-green-600/80 dark:text-green-400/80">{connectedEmail}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full gap-2"
          variant="outline"
          size="lg"
        >
          <Mail className="h-5 w-5" />
          {connecting ? "Opening OAuth..." : "Connect Gmail"}
          <ExternalLink className="h-4 w-4 ml-auto" />
        </Button>
      )}

      {/* Skip note */}
      {!isConnected && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            This is optional. You can connect Gmail later from Settings. Without it, you&apos;ll
            need to update application statuses manually.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          {isConnected ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}
