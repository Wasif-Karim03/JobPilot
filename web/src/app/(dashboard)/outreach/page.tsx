"use client";

import { useState } from "react";
import {
  Mail,
  Linkedin,
  Copy,
  Check,
  Send,
  Edit3,
  User,
  Briefcase,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DraftStatus = "DRAFT" | "SENT" | "REPLIED" | "NO_RESPONSE";

const STATUS_COLORS: Record<DraftStatus, string> = {
  DRAFT: "text-muted-foreground border-muted",
  SENT: "text-blue-600 border-blue-200 bg-blue-50",
  REPLIED: "text-green-600 border-green-200 bg-green-50",
  NO_RESPONSE: "text-amber-600 border-amber-200 bg-amber-50",
};

function DraftCard({
  draft,
  onMarkSent,
}: {
  draft: {
    id: string;
    type: string;
    subject?: string | null;
    content: string;
    status: string;
    sentAt?: Date | null;
  };
  onMarkSent: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [copied, setCopied] = useState(false);

  const updateDraft = trpc.outreach.updateDraft.useMutation({
    onSuccess: () => {
      setEditing(false);
      toast.success("Draft saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopy = () => {
    const text = draft.type === "EMAIL" && subject ? `Subject: ${subject}\n\n${content}` : content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charLimit = draft.type === "LINKEDIN" ? 200 : undefined;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {draft.type === "EMAIL" ? (
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Linkedin className="h-3.5 w-3.5 text-blue-600" />
        )}
        <span className="text-xs font-medium">{draft.type === "EMAIL" ? "Email" : "LinkedIn Note"}</span>
        <Badge
          variant="outline"
          className={cn("text-xs ml-auto", STATUS_COLORS[draft.status as DraftStatus])}
        >
          {draft.status}
        </Badge>
      </div>

      {editing ? (
        <div className="space-y-2">
          {draft.type === "EMAIL" && (
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="text-sm"
            />
          )}
          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-sm min-h-[120px] resize-none"
              maxLength={charLimit}
            />
            {charLimit && (
              <span
                className={cn(
                  "absolute bottom-2 right-3 text-xs",
                  content.length > charLimit - 20 ? "text-amber-600" : "text-muted-foreground"
                )}
              >
                {content.length}/{charLimit}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                updateDraft.mutate({ id: draft.id, content, subject: subject || undefined })
              }
              disabled={updateDraft.isPending}
            >
              {updateDraft.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{draft.content}</p>
      )}

      {!editing && draft.status === "DRAFT" && (
        <div className="flex gap-1.5 pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(true)}>
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onMarkSent(draft.id)}
          >
            <Send className="h-3 w-3 mr-1" />
            Mark Sent
          </Button>
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
}: {
  contact: {
    id: string;
    name: string;
    title?: string | null;
    email?: string | null;
    isAlumni: boolean;
    alumniSchool?: string | null;
    outreachPriority: number;
    relationshipType: string;
    profileSummary?: string | null;
    outreachDrafts: Array<{
      id: string;
      type: string;
      subject?: string | null;
      content: string;
      status: string;
      sentAt?: Date | null;
    }>;
    job: { id: string; title: string; company: string };
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const generateDraft = trpc.outreach.generateDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft generated");
      utils.outreach.getAllContacts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markSent = trpc.outreach.markSent.useMutation({
    onSuccess: () => {
      toast.success("Marked as sent");
      utils.outreach.getAllContacts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const hasDrafts = contact.outreachDrafts.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{contact.name}</span>
                {contact.isAlumni && (
                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 bg-purple-50 gap-1">
                    <GraduationCap className="h-2.5 w-2.5" />
                    Alumni
                  </Badge>
                )}
                {contact.outreachPriority >= 80 && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 gap-1">
                    <Star className="h-2.5 w-2.5" />
                    Priority
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {contact.title} · {contact.relationshipType.replace(/_/g, " ")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {contact.job.title} at {contact.job.company}
                </span>
              </div>
              {contact.email && (
                <p className="text-xs text-muted-foreground">{contact.email}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {contact.profileSummary && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {contact.profileSummary}
            </p>
          )}

          {hasDrafts ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Outreach Drafts</p>
              {contact.outreachDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onMarkSent={(id) => markSent.mutate({ id })}
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateDraft.mutate({ contactId: contact.id, type: "EMAIL" })}
                disabled={generateDraft.isPending}
              >
                {generateDraft.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Mail className="h-3 w-3 mr-1" />
                )}
                Generate Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateDraft.mutate({ contactId: contact.id, type: "LINKEDIN" })}
                disabled={generateDraft.isPending}
              >
                <Linkedin className="h-3 w-3 mr-1" />
                LinkedIn Note
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function OutreachPage() {
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "ALL">("ALL");

  const { data, isLoading } = trpc.outreach.getAllContacts.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    pageSize: 50,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outreach</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Contacts discovered for your high-match jobs
          </p>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalCount} contact{data.totalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as DraftStatus | "ALL")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Contacts</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="REPLIED">Replied</SelectItem>
            <SelectItem value="NO_RESPONSE">No Response</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !data?.contacts.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No contacts yet</p>
          <p className="text-xs mt-1">
            Contacts are discovered automatically for jobs with 80%+ match scores.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
