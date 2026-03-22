"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

export function StepResume({ onNext }: { onNext: () => void }) {
  const { resume, setResume, setSavedResumeId } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(resume.method ?? "paste");

  const createResume = trpc.resume.create.useMutation();

  async function handleNext() {
    setSaving(true);
    try {
      if (activeTab === "paste") {
        if (!resume.pastedText.trim()) {
          toast.error("Please paste your resume text");
          return;
        }
        const r = await createResume.mutateAsync({
          title: "Master Resume",
          format: "STRUCTURED",
          parsedContent: resume.pastedText,
          summary: resume.pastedText.slice(0, 500),
        });
        setSavedResumeId(r.id);
        setResume({ method: "paste" });
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

      // Mark as master
      if (createResume.data?.id) {
        // setMaster handled by separate mutation if needed
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
        {
          company: "",
          title: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: [""],
        },
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
      <div>
        <h2 className="text-xl font-semibold">Add your master resume</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is the base resume the AI will use to match jobs and generate tailored versions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste">Paste Resume Text</TabsTrigger>
          <TabsTrigger value="structured">Fill Form</TabsTrigger>
        </TabsList>

        {/* ── PASTE TAB ── */}
        <TabsContent value="paste" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="resume-text">Resume text</Label>
            <Textarea
              id="resume-text"
              placeholder="Paste your resume text here. Include your experience, skills, education, etc."
              rows={14}
              value={resume.pastedText}
              onChange={(e) => setResume({ pastedText: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {resume.pastedText.length} characters
            </p>
          </div>
        </TabsContent>

        {/* ── STRUCTURED TAB ── */}
        <TabsContent value="structured" className="space-y-6 mt-4">
          {/* Contact Info */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contact Info
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={resume.contactInfo.name}
                    onChange={(e) =>
                      setResume({ contactInfo: { ...resume.contactInfo, name: e.target.value } })
                    }
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ci-email">Email *</Label>
                  <Input
                    id="ci-email"
                    type="email"
                    value={resume.contactInfo.email}
                    onChange={(e) =>
                      setResume({ contactInfo: { ...resume.contactInfo, email: e.target.value } })
                    }
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={resume.contactInfo.phone}
                    onChange={(e) =>
                      setResume({ contactInfo: { ...resume.contactInfo, phone: e.target.value } })
                    }
                    placeholder="+1-555-000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={resume.contactInfo.location}
                    onChange={(e) =>
                      setResume({
                        contactInfo: { ...resume.contactInfo, location: e.target.value },
                      })
                    }
                    placeholder="Columbus, OH"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={resume.contactInfo.linkedin}
                    onChange={(e) =>
                      setResume({
                        contactInfo: { ...resume.contactInfo, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="github">GitHub URL</Label>
                  <Input
                    id="github"
                    value={resume.contactInfo.github}
                    onChange={(e) =>
                      setResume({ contactInfo: { ...resume.contactInfo, github: e.target.value } })
                    }
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                value={resume.summary}
                onChange={(e) => setResume({ summary: e.target.value })}
                placeholder="Brief summary of your experience and goals..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Skills (comma-separated)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["technical", "Languages"],
                    ["frameworks", "Frameworks"],
                    ["tools", "Tools & Platforms"],
                    ["languages", "Spoken Languages"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <Input
                      value={resume.skills[key]}
                      onChange={(e) =>
                        setResume({ skills: { ...resume.skills, [key]: e.target.value } })
                      }
                      placeholder={key === "languages" ? "English, Spanish" : "TypeScript, Python"}
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
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Work Experience
                </h3>
                <Button size="sm" variant="outline" onClick={addExperience}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {resume.experience.map((exp, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Position {i + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeExperience(i)}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["company", "Company"],
                        ["title", "Title"],
                        ["location", "Location"],
                        ["startDate", "Start (YYYY-MM)"],
                        ["endDate", "End (YYYY-MM or blank)"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          className="h-8 text-sm"
                          value={(exp as unknown as Record<string, string>)[field]}
                          onChange={(e) => updateExperience(i, field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Bullet Points</Label>
                    {exp.bullets.map((b, bi) => (
                      <Input
                        key={bi}
                        className="text-sm"
                        value={b}
                        onChange={(e) => updateBullet(i, bi, e.target.value)}
                        placeholder="Describe an achievement or responsibility..."
                      />
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
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
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Education
                </h3>
                <Button size="sm" variant="outline" onClick={addEducation}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {resume.education.map((edu, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["school", "School"],
                        ["degree", "Degree"],
                        ["field", "Field of Study"],
                        ["gpa", "GPA"],
                        ["startDate", "Start (YYYY-MM)"],
                        ["endDate", "End (YYYY-MM)"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
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
        </TabsContent>
      </Tabs>

      <Button onClick={handleNext} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}
