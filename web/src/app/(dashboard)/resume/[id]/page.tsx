"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Save,
  Star,
  LayoutTemplate,
  AlignLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { JobDetailSkeleton } from "@/components/shared/loading";
import { StructuredForm } from "@/components/resume/structured-form";
import { RichEditor } from "@/components/resume/rich-editor";
import { ResumePreview } from "@/components/resume/resume-preview";
import { PdfTemplate } from "@/components/resume/pdf-template";
import { KeywordSuggestions } from "@/components/resume/keyword-suggestions";
import {
  type ResumeFormData,
  emptyContact,
  emptyExp,
  emptyEdu,
  emptyProject,
  emptyCert,
  emptySkills,
  parseResumeJson,
} from "@/components/resume/structured-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorTab = "structured" | "rich";

function buildFormData(resume: {
  contactInfo: unknown;
  summary: string | null;
  skills: unknown;
  experience: unknown;
  education: unknown;
  projects: unknown;
  certifications: unknown;
}): ResumeFormData {
  return {
    contactInfo: (parseResumeJson(resume.contactInfo, emptyContact()) as ResumeFormData["contactInfo"]),
    summary: resume.summary ?? "",
    skills: (parseResumeJson(resume.skills, emptySkills()) as ResumeFormData["skills"]),
    experience: (parseResumeJson(resume.experience, [emptyExp()]) as ResumeFormData["experience"]),
    education: (parseResumeJson(resume.education, [emptyEdu()]) as ResumeFormData["education"]),
    projects: (parseResumeJson(resume.projects, [emptyProject()]) as ResumeFormData["projects"]),
    certifications: (parseResumeJson(resume.certifications, [emptyCert()]) as ResumeFormData["certifications"]),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<EditorTab>("structured");
  const [showPreview, setShowPreview] = useState(true);
  const [formData, setFormData] = useState<ResumeFormData | null>(null);
  const [richContent, setRichContent] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<ResumeFormData | null>(null);
  const latestRichRef = useRef<Record<string, unknown> | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: resume, isLoading } = trpc.resume.getById.useQuery({ id });

  // Tailored keyword suggestions: check if resume was tailored for a job
  const tailoredJobId = resume?.tailoredFor?.[0]?.jobId ?? null;
  const { data: jobData } = trpc.job.getById.useQuery(
    { id: tailoredJobId! },
    { enabled: !!tailoredJobId }
  );

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const updateMutation = trpc.resume.update.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      utils.resume.list.invalidate();
    },
    onError: () => setSaveStatus("unsaved"),
  });

  const setMasterMutation = trpc.resume.setMaster.useMutation({
    onSuccess: () => utils.resume.list.invalidate(),
  });

  // ─── Init form data from query result ────────────────────────────────────────

  useEffect(() => {
    if (!resume) return;
    setTitle(resume.title);
    if (resume.format === "RICH_TEXT" || resume.format === "UPLOADED") {
      setTab("rich");
      setRichContent(resume.richTextContent as Record<string, unknown> | null);
      latestRichRef.current = resume.richTextContent as Record<string, unknown> | null;
    } else {
      const fd = buildFormData(resume as Parameters<typeof buildFormData>[0]);
      setFormData(fd);
      latestDataRef.current = fd;
    }
  }, [resume?.id]); // only re-init when id changes

  // ─── Auto-save (debounced 2s) ────────────────────────────────────────────────

  const triggerSave = useCallback(
    (data: ResumeFormData | null, rich: Record<string, unknown> | null, currentTab: EditorTab) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("unsaved");

      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateMutation.mutate({
          id,
          ...(currentTab === "structured" && data
            ? {
                format: "STRUCTURED",
                contactInfo: data.contactInfo as unknown as Record<string, unknown>,
                summary: data.summary,
                skills: data.skills as unknown as Record<string, unknown>,
                experience: data.experience as unknown as Record<string, unknown>[],
                education: data.education as unknown as Record<string, unknown>[],
                projects: data.projects as unknown as Record<string, unknown>[],
                certifications: data.certifications as unknown as Record<string, unknown>[],
              }
            : {
                format: "RICH_TEXT",
                richTextContent: rich as Record<string, unknown>,
              }),
        });
      }, 2000);
    },
    [id, updateMutation]
  );

  function handleFormChange(partial: Partial<ResumeFormData>) {
    const merged = { ...(latestDataRef.current ?? buildFormData(resume!)), ...partial } as ResumeFormData;
    setFormData(merged);
    latestDataRef.current = merged;
    triggerSave(merged, latestRichRef.current, "structured");
  }

  function handleRichChange(json: Record<string, unknown>) {
    setRichContent(json);
    latestRichRef.current = json;
    triggerSave(latestDataRef.current, json, "rich");
  }

  function handleTitleBlur() {
    if (title !== resume?.title) {
      updateMutation.mutate({ id, title });
    }
  }

  // ─── Add keyword to skills.technical ─────────────────────────────────────────

  function handleAddKeyword(keyword: string) {
    if (!formData) return;
    const current = formData.skills.technical;
    const keywords = current ? current.split(",").map((k) => k.trim()) : [];
    if (!keywords.map((k) => k.toLowerCase()).includes(keyword.toLowerCase())) {
      const updated: ResumeFormData = {
        ...formData,
        skills: {
          ...formData.skills,
          technical: [...keywords, keyword].filter(Boolean).join(", "),
        },
      };
      handleFormChange(updated);
    }
  }

  // ─── PDF generation ──────────────────────────────────────────────────────────

  async function handleDownloadPdf() {
    if (!formData && !richContent) return;
    setIsGeneratingPdf(true);
    try {
      const effectiveData: ResumeFormData = formData ?? {
        contactInfo: emptyContact(),
        summary: "",
        skills: emptySkills(),
        experience: [emptyExp()],
        education: [emptyEdu()],
        projects: [emptyProject()],
        certifications: [emptyCert()],
      };
      const blob = await pdf(
        <PdfTemplate data={effectiveData} resumeTitle={title} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (isLoading || !resume) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <JobDetailSkeleton />
      </div>
    );
  }

  // ─── Keyword suggestions data ─────────────────────────────────────────────────

  const missingKeywords: string[] = jobData?.missingKeywords ?? [];
  const existingKeywords = formData
    ? [
        ...formData.skills.technical.split(","),
        ...formData.skills.frameworks.split(","),
        ...formData.skills.tools.split(","),
      ].map((k) => k.trim()).filter(Boolean)
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/resume")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Resumes</span>
        </Button>

        {/* Editable title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="max-w-xs font-medium h-8 px-2 border-transparent hover:border-input focus:border-input"
        />

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Master badge */}
          {resume.isMaster ? (
            <Badge className="gap-1 hidden sm:flex">
              <Star className="h-3 w-3" />
              Master
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex gap-1.5"
              onClick={() => setMasterMutation.mutate({ id })}
              disabled={setMasterMutation.isPending}
            >
              <Star className="h-3.5 w-3.5" />
              Set Master
            </Button>
          )}

          {/* Version & save status */}
          <span className="text-xs text-muted-foreground hidden md:block">v{resume.version}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[60px]">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <Save className="h-3 w-3" />
                <span>Unsaved</span>
              </>
            )}
            {saveStatus === "saved" && (
              <span className="text-green-600 dark:text-green-400">Saved</span>
            )}
          </div>

          {/* Preview toggle (mobile) */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          {/* Download PDF */}
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || (!formData && !richContent)}
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Editor tab switcher */}
      <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as EditorTab)}>
          <TabsList className="h-8">
            <TabsTrigger value="structured" className="text-xs gap-1.5 h-7">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Structured Form
            </TabsTrigger>
            <TabsTrigger value="rich" className="text-xs gap-1.5 h-7">
              <AlignLeft className="h-3.5 w-3.5" />
              Rich Text
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content: editor + preview split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div
          className={`overflow-y-auto ${showPreview ? "lg:w-1/2 w-full" : "w-full"} ${showPreview ? "hidden lg:block lg:border-r" : ""}`}
          style={showPreview ? { display: undefined } : { display: "block" }}
        >
          {/* Actually let's handle visibility properly */}
          <EditorPane
            tab={tab}
            formData={formData}
            richContent={richContent}
            onFormChange={handleFormChange}
            onRichChange={handleRichChange}
            missingKeywords={missingKeywords}
            existingKeywords={existingKeywords}
            jobTitle={jobData?.title}
            onAddKeyword={handleAddKeyword}
            showPreview={showPreview}
          />
        </div>

        {/* Preview pane (desktop only or when explicitly shown on mobile) */}
        {showPreview && (
          <div className="flex-1 overflow-y-auto bg-muted/20 hidden lg:block">
            <div className="p-4">
              <div className="max-w-[700px] mx-auto shadow-lg rounded overflow-hidden border">
                {formData ? (
                  <ResumePreview data={formData} title={title} />
                ) : (
                  <div className="bg-white p-8 text-center text-sm text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    Start writing to see your resume preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile preview overlay */}
      {showPreview && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background overflow-y-auto">
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>
              <EyeOff className="h-4 w-4 mr-1" />
              Close Preview
            </Button>
          </div>
          <div className="p-4">
            {formData ? (
              <ResumePreview data={formData} title={title} />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-16">
                Switch to Structured Form to see a preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditorPane sub-component ─────────────────────────────────────────────────

interface EditorPaneProps {
  tab: EditorTab;
  formData: ResumeFormData | null;
  richContent: Record<string, unknown> | null;
  onFormChange: (data: Partial<ResumeFormData>) => void;
  onRichChange: (json: Record<string, unknown>) => void;
  missingKeywords: string[];
  existingKeywords: string[];
  jobTitle?: string;
  onAddKeyword: (keyword: string) => void;
  showPreview: boolean;
}

function EditorPane({
  tab,
  formData,
  richContent,
  onFormChange,
  onRichChange,
  missingKeywords,
  existingKeywords,
  jobTitle,
  onAddKeyword,
}: EditorPaneProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Keyword suggestions (if tailored for a job) */}
      {missingKeywords.length > 0 && tab === "structured" && (
        <KeywordSuggestions
          keywords={missingKeywords}
          existingKeywords={existingKeywords}
          onAdd={onAddKeyword}
          jobTitle={jobTitle}
        />
      )}

      {tab === "structured" ? (
        formData ? (
          <StructuredForm data={formData} onChange={onFormChange} />
        ) : (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading form…</div>
        )
      ) : (
        <RichEditor
          content={richContent}
          onChange={onRichChange}
          placeholder="Write your resume here…"
        />
      )}
    </div>
  );
}
