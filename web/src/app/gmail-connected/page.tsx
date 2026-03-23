"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// This page is shown inside the OAuth popup after Gmail is connected.
// It notifies the parent window and closes itself.
export default function GmailConnectedPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "GMAIL_CONNECTED" }, window.location.origin);
      setTimeout(() => window.close(), 800);
    } else {
      // Fallback: if not in popup, just redirect
      window.location.href = "/settings?gmail=connected";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-lg font-medium">Gmail connected!</p>
        <p className="text-sm text-muted-foreground">Closing window...</p>
      </div>
    </div>
  );
}
