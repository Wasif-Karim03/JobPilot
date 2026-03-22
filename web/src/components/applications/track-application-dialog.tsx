"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const APPLIED_VIA_OPTIONS = [
  { value: "company_site", label: "Company Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

interface TrackApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  company: string;
  onSuccess?: () => void;
}

export function TrackApplicationDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  company,
  onSuccess,
}: TrackApplicationDialogProps) {
  const utils = trpc.useUtils();
  const [appliedVia, setAppliedVia] = useState<string>("");
  const [appliedDate, setAppliedDate] = useState(
    new Date().toISOString().split("T")[0] // YYYY-MM-DD
  );
  const [notes, setNotes] = useState("");

  const createMutation = trpc.application.create.useMutation({
    onSuccess: () => {
      utils.application.getKanbanData.invalidate();
      utils.job.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  function handleSubmit() {
    createMutation.mutate({
      jobId,
      appliedVia: appliedVia as "company_site" | "linkedin" | "indeed" | "referral" | "other" | null | undefined,
      appliedDate: appliedDate ? new Date(appliedDate).toISOString() : undefined,
      notes: notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track Application</DialogTitle>
          <DialogDescription>
            {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Applied via</Label>
            <Select value={appliedVia} onValueChange={(v) => v && setAppliedVia(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform…" />
              </SelectTrigger>
              <SelectContent>
                {APPLIED_VIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Applied date</Label>
            <Input
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this application…"
              className="resize-none min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : "Track Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
