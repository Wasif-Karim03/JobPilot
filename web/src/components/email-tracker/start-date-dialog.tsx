"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

interface StartDateDialogProps {
  onComplete: () => void;
}

export function StartDateDialog({ onComplete }: StartDateDialogProps) {
  const [date, setDate] = useState("");
  const utils = trpc.useUtils();

  const setStartDate = trpc.emailTracker.setStartDate.useMutation({
    onSuccess: async () => {
      await utils.emailTracker.getStats.invalidate();
      toast.success("Start date saved! Syncing your emails now…");
      onComplete();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setStartDate.mutate({ date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">When did you start applying?</h2>
        </div>

        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          We&apos;ll scan your Gmail from this date forward to find all your job application
          emails and track them automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Job Search Start Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pick the date you sent your first job application.
            </p>
          </div>

          <button
            type="submit"
            disabled={!date || setStartDate.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {setStartDate.isPending ? "Saving…" : "Start Tracking My Applications"}
          </button>
        </form>
      </div>
    </div>
  );
}
