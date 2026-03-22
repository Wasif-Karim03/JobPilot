"use client";

import { useState } from "react";
import {
  Mail,
  Linkedin,
  ExternalLink,
  Copy,
  CheckCircle2,
  Users,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Contact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  emailConfidence: number | null;
  linkedinUrl: string | null;
  isAlumni: boolean;
  alumniSchool: string | null;
  relationshipType: string;
  outreachPriority: number;
  profileSummary: string | null;
  outreachDrafts: Array<{
    id: string;
    type: string;
    subject: string | null;
    content: string;
    status: string;
  }>;
};

type CompanyInfo = {
  size?: string;
  industry?: string;
  description?: string;
  founded?: string;
  headquarters?: string;
};

interface CompanyIntelProps {
  contacts: Contact[];
  companyInfo: CompanyInfo | null;
  company: string;
}

function formatRelationType(type: string) {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ContactCard({ contact }: { contact: Contact }) {
  const [copied, setCopied] = useState(false);

  const emailDraft = contact.outreachDrafts.find((d) => d.type === "EMAIL");
  const linkedinDraft = contact.outreachDrafts.find((d) => d.type === "LINKEDIN");

  async function copyDraft(content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{contact.name}</span>
            {contact.isAlumni && (
              <Badge variant="outline" className="text-xs gap-1 text-purple-600 border-purple-300">
                <GraduationCap className="h-2.5 w-2.5" />
                Alumni
              </Badge>
            )}
            {contact.outreachPriority >= 3 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Priority
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{contact.title}</p>
          <p className="text-xs text-muted-foreground/70">{formatRelationType(contact.relationshipType)}</p>
        </div>
      </div>

      {contact.profileSummary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{contact.profileSummary}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-3 w-3" />
            {contact.email}
            {contact.emailConfidence != null && (
              <span className="text-muted-foreground/60">({contact.emailConfidence}%)</span>
            )}
          </a>
        )}
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Linkedin className="h-3 w-3" />
            LinkedIn
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {(emailDraft || linkedinDraft) && (
        <div className="space-y-2 pt-1 border-t">
          <p className="text-xs font-medium text-muted-foreground">Outreach drafts</p>
          {emailDraft && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1"
                  onClick={() => copyDraft(emailDraft.content)}
                >
                  {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </Button>
              </div>
              {emailDraft.subject && (
                <p className="text-xs text-foreground font-medium">{emailDraft.subject}</p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 rounded p-2">
                {emailDraft.content}
              </p>
            </div>
          )}
          {linkedinDraft && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">LinkedIn note</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1"
                  onClick={() => copyDraft(linkedinDraft.content)}
                >
                  {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                {linkedinDraft.content}
              </p>
              <p className="text-xs text-muted-foreground/60">{linkedinDraft.content.length}/200 chars</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CompanyIntel({ contacts, companyInfo, company }: CompanyIntelProps) {
  const alumni = contacts.filter((c) => c.isAlumni);
  const others = contacts.filter((c) => !c.isAlumni);
  const prioritized = [...alumni, ...others].sort((a, b) => b.outreachPriority - a.outreachPriority);

  return (
    <div className="space-y-4">
      {/* Company info */}
      {companyInfo && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium text-sm">{company}</h3>
          {companyInfo.description && (
            <p className="text-sm text-muted-foreground">{companyInfo.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {companyInfo.size && <span>Size: {companyInfo.size}</span>}
            {companyInfo.industry && <span>Industry: {companyInfo.industry}</span>}
            {companyInfo.founded && <span>Founded: {companyInfo.founded}</span>}
            {companyInfo.headquarters && <span>HQ: {companyInfo.headquarters}</span>}
          </div>
        </div>
      )}

      {/* Contacts */}
      {prioritized.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">
              {prioritized.length} contact{prioritized.length !== 1 ? "s" : ""} found
            </h3>
            {alumni.length > 0 && (
              <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                <GraduationCap className="h-2.5 w-2.5 mr-1" />
                {alumni.length} alumni
              </Badge>
            )}
          </div>
          {prioritized.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No contacts discovered yet.
            {" "}Company research runs automatically for high-match jobs (80%+).
          </p>
        </div>
      )}
    </div>
  );
}
