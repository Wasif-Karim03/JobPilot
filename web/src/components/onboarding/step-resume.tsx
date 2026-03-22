"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Upload, FileText, ClipboardPaste, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

type TabId = "upload" | "paste" | "form";

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: "upload",
    label: "Upload PDF",
    icon: Upload,
    desc: "Upload your resume file",
  },
  {
    id: "paste",
    label: "Paste Text",
    icon: ClipboardPaste,
    desc: "Copy and paste your resume",
  },
  {
    id: "form",
    label: "Fill Form",
    icon: FileText,
    desc: "Enter details manually",
  },
];

export function StepResume({ onNext }: { onNext: () => void }) {
  const { resume, setResume, setSavedResumeId } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("upload");

  // PDF upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createResume = trpc.resume.create.useMutation();

  async function handleFileSelect(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }

      setUploadedFile({ name: file.name, url: data.fileUrl });
      setResume({ pastedText: data.extractedText });
      toast.success(`Resume read successfully — ${data.characterCount} characters extracted`);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleNext() {
    setSaving(true);
    try {
      if (activeTab === "upload" || activeTab === "paste") {
        const text = resume.pastedText.trim();
        if (!text) {
          toast.error(activeTab === "upload" ? "Please upload your resume first" : "Please paste your resume text");
          return;
        }
        const r = await createResume.mutateAsync({
          title: "Master Resume",
          format: "STRUCTURED",
          parsedContent: text,
          summary: text.slice(0, 500),
          ...(uploadedFile && { rawFileUrl: uploadedFile.url }),
        });
        setSavedResumeId(r.id);
        setResume({ method: activeTab === "upload" ? "paste" : "paste" });
      } else {
        if (!resume.contactInfo.name && !resume.contactInfo.email) {
          toast.error("Please fill in at least your name and email");
          return;
        }
        const r = await createResume.mutateAsync({
          title: "Master Resume",
          format: "STRUCTURED",
          contactInfo: resume.contactInfo,
          summary: resume.summary || undefined,
          experience:
            resume.experience.length > 0
              ? resume.experience.map((e) => ({
                  ...e,
                  bullets: e.bullets.filter(Boolean),
                }))
              : undefined,
          education: resume.education.length > 0 ? resume.education : undefined,
          skills: {
            technical: resume.skills.technical
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            frameworks: resume.skills.frameworks
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            tools: resume.skills.tools
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            languages: resume.skills.languages
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
          parsedContent: [
            resume.contactInfo.name,
            resume.contactInfo.email,
            resume.contactInfo.location,
            resume.skills.technical,
            resume.skills.frameworks,
          ]
            .filter(Boolean)
            .join(" | "),
        });
        setSavedResumeId(r.id);
        setResume({ method: "structured" });
      }

      onNext();
    } catch {
      toast.error("Failed to save resume. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function addExperience() {
    setResume({
      experience: [
        ...resume.experience,
        { company: "", title: "", location: "", startDate: "", endDate: "", bullets: [""] },
      ],
    });
  }

  function removeExperience(i: number) {
    setResume({ experience: resume.experience.filter((_, idx) => idx !== i) });
  }

  function updateExperience(i: number, field: string, value: string) {
    const updated = [...resume.experience];
    updated[i] = { ...updated[i], [field]: value };
    setResume({ experience: updated });
  }

  function updateBullet(expIdx: number, bulletIdx: number, value: string) {
    const updated = [...resume.experience];
    const bullets = [...updated[expIdx].bullets];
    bullets[bulletIdx] = value;
    updated[expIdx] = { ...updated[expIdx], bullets };
    setResume({ experience: updated });
  }

  function addBullet(expIdx: number) {
    const updated = [...resume.experience];
    updated[expIdx] = { ...updated[expIdx], bullets: [...updated[expIdx].bullets, ""] };
    setResume({ experience: updated });
  }

  function addEducation() {
    setResume({
      education: [
        ...resume.education,
        { school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "" },
      ],
    });
  }

  function updateEducation(i: number, field: string, value: string) {
    const updated = [...resume.education];
    updated[i] = { ...updated[i], [field]: value };
    setResume({ education: updated });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Add your master resume</h2>
        <p className="text-sm text-muted-foreground mt-1">
          JobPilot uses this to find matching jobs and score your fit. The more complete it is,
          the better your matches.
        </p>
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1.5">
          For best results, include:
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {[
            "All job titles and companies",
            "Skills, tools & frameworks",
            "Education & certifications",
            "Side projects or volunteer work",
          ].map((tip) => (
            <p key={tip} className="text-xs text-amber-700 dark:text-amber-400/80">
              · {tip}
            </p>
          ))}
        </div>
      </div>

      {/* Custom Tab Bar */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
              activeTab === id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs opacity-70 hidden sm:block">{desc}</span>
          </button>
        ))}
      </div>

      {/* ── UPLOAD TAB ── */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = "";
            }}
          />

          {uploadedFile ? (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Resume uploaded and read
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500 truncate">
                    {uploadedFile.name}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-auto shrink-0 text-xs text-muted-foreground"
                >
                  Replace
                </Button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Extracted text preview — you can edit before saving:
                </p>
                <Textarea
                  value={resume.pastedText}
                  onChange={(e) => setResume({ pastedText: e.target.value })}
                  rows={8}
                  className="text-xs font-mono resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {resume.pastedText.length} characters extracted
                </p>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
              }}
              className={`rounded-lg border-2 border-dashed p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Reading your resume...</p>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Drop your resume here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse · PDF only · Max 5MB
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Choose File
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>
              Your PDF must have selectable text. Scanned image PDFs cannot be read — use the
              &quot;Paste Text&quot; tab instead.
            </p>
          </div>
        </div>
      )}

      {/* ── PASTE TAB ── */}
      {activeTab === "paste" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="resume-text">Paste your resume text</Label>
            <p className="text-xs text-muted-foreground">
              Open your resume, select all (Ctrl+A / Cmd+A), copy, and paste below.
            </p>
          </div>
          <Textarea
            id="resume-text"
            placeholder="Paste your resume here — name, contact info, work experience, education, skills, projects, certifications..."
            rows={16}
            value={resume.pastedText}
            onChange={(e) => setResume({ pastedText: e.target.value })}
            className="font-mono text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {resume.pastedText.length} characters
            </p>
            {resume.pastedText.length > 0 && resume.pastedText.length < 300 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Looks short — add more detail for better matches
              </p>
            )}
            {resume.pastedText.length >= 300 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Good length
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FORM TAB ── */}
      {activeTab === "form" && (
        <div className="space-y-4">
          {/* Contact Info */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Info
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Full Name *</Label>
                  <Input
                    id="name"
                    value={resume.contactInfo.name}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, name: e.target.value } })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ci-email" className="text-sm">Email *</Label>
                  <Input
                    id="ci-email"
                    type="email"
                    value={resume.contactInfo.email}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, email: e.target.value } })}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm">Phone</Label>
                  <Input
                    id="phone"
                    value={resume.contactInfo.phone}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, phone: e.target.value } })}
                    placeholder="+1-555-000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-sm">Location</Label>
                  <Input
                    id="location"
                    value={resume.contactInfo.location}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, location: e.target.value } })}
                    placeholder="Columbus, OH"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin" className="text-sm">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={resume.contactInfo.linkedin}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, linkedin: e.target.value } })}
                    placeholder="linkedin.com/in/yourname"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="github" className="text-sm">GitHub URL</Label>
                  <Input
                    id="github"
                    value={resume.contactInfo.github}
                    onChange={(e) => setResume({ contactInfo: { ...resume.contactInfo, github: e.target.value } })}
                    placeholder="github.com/yourname"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label htmlFor="summary" className="text-sm">Professional Summary</Label>
              <Textarea
                id="summary"
                value={resume.summary}
                onChange={(e) => setResume({ summary: e.target.value })}
                placeholder="2–3 sentences about your experience, skills, and what you're looking for..."
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Skills <span className="normal-case font-normal">(comma-separated)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["technical", "Programming Languages", "TypeScript, Python, Java"],
                    ["frameworks", "Frameworks & Libraries", "React, Node.js, Django"],
                    ["tools", "Tools & Platforms", "AWS, Docker, GitHub"],
                    ["languages", "Spoken Languages", "English, Spanish"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      value={resume.skills[key]}
                      onChange={(e) => setResume({ skills: { ...resume.skills, [key]: e.target.value } })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Work Experience
                </p>
                <Button size="sm" variant="outline" onClick={addExperience} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add position
                </Button>
              </div>
              {resume.experience.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No positions added yet. Click &quot;Add position&quot; to start.
                </p>
              )}
              {resume.experience.map((exp, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Position {i + 1}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeExperience(i)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["company", "Company"],
                        ["title", "Job Title"],
                        ["location", "Location"],
                        ["startDate", "Start Date (YYYY-MM)"],
                        ["endDate", "End Date (or leave blank)"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input
                          className="h-8 text-sm"
                          value={(exp as unknown as Record<string, string>)[field]}
                          onChange={(e) => updateExperience(i, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Bullet Points (achievements &amp; responsibilities)
                    </Label>
                    {exp.bullets.map((b, bi) => (
                      <Input
                        key={bi}
                        className="text-sm"
                        value={b}
                        onChange={(e) => updateBullet(i, bi, e.target.value)}
                        placeholder="e.g. Led migration to microservices, reducing latency by 40%"
                      />
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => addBullet(i)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add bullet
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Education
                </p>
                <Button size="sm" variant="outline" onClick={addEducation} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add school
                </Button>
              </div>
              {resume.education.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No education added yet. Click &quot;Add school&quot; to start.
                </p>
              )}
              {resume.education.map((edu, i) => (
                <div key={i} className="border rounded-lg p-4 bg-muted/10">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["school", "School / University"],
                        ["degree", "Degree (e.g. B.S.)"],
                        ["field", "Field of Study"],
                        ["gpa", "GPA (optional)"],
                        ["startDate", "Start (YYYY-MM)"],
                        ["endDate", "End (YYYY-MM)"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input
                          className="h-8 text-sm"
                          value={(edu as unknown as Record<string, string>)[field]}
                          onChange={(e) => updateEducation(i, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Button onClick={handleNext} disabled={saving || uploading} className="w-full" size="lg">
        {saving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}
