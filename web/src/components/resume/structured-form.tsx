"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  gpa: string;
  startDate: string;
  endDate: string;
  honors: string;
}

export interface ProjectEntry {
  name: string;
  description: string;
  tech: string;
  url: string;
  bullets: string[];
}

export interface CertEntry {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface SkillsData {
  technical: string;
  frameworks: string;
  tools: string;
  languages: string;
}

export interface ResumeFormData {
  contactInfo: ContactInfo;
  summary: string;
  skills: SkillsData;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  certifications: CertEntry[];
}

// ─── Default factories ────────────────────────────────────────────────────────

export function emptyContact(): ContactInfo {
  return { name: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "" };
}

export function emptyExp(): ExperienceEntry {
  return { company: "", title: "", location: "", startDate: "", endDate: "", bullets: [""] };
}

export function emptyEdu(): EducationEntry {
  return { school: "", degree: "", field: "", gpa: "", startDate: "", endDate: "", honors: "" };
}

export function emptyProject(): ProjectEntry {
  return { name: "", description: "", tech: "", url: "", bullets: [""] };
}

export function emptyCert(): CertEntry {
  return { name: "", issuer: "", date: "", url: "" };
}

export function emptySkills(): SkillsData {
  return { technical: "", frameworks: "", tools: "", languages: "" };
}

// ─── Helper to cast JSON from Prisma to typed form data ──────────────────────

export function parseResumeJson(data: unknown, fallback: unknown): unknown {
  if (!data || data === null) return fallback;
  return data;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-5 space-y-4">
        <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StructuredFormProps {
  data: ResumeFormData;
  onChange: (data: Partial<ResumeFormData>) => void;
}

export function StructuredForm({ data, onChange }: StructuredFormProps) {
  const { contactInfo, summary, skills, experience, education, projects, certifications } = data;

  function setContact(partial: Partial<ContactInfo>) {
    onChange({ contactInfo: { ...contactInfo, ...partial } });
  }
  function setSkills(partial: Partial<SkillsData>) {
    onChange({ skills: { ...skills, ...partial } });
  }

  // ── Experience helpers ──
  function addExp() {
    onChange({ experience: [...experience, emptyExp()] });
  }
  function removeExp(i: number) {
    onChange({ experience: experience.filter((_, idx) => idx !== i) });
  }
  function updateExp(i: number, partial: Partial<ExperienceEntry>) {
    const updated = [...experience];
    updated[i] = { ...updated[i], ...partial };
    onChange({ experience: updated });
  }
  function updateExpBullet(expIdx: number, bulletIdx: number, value: string) {
    const updated = [...experience];
    const bullets = [...updated[expIdx].bullets];
    bullets[bulletIdx] = value;
    updated[expIdx] = { ...updated[expIdx], bullets };
    onChange({ experience: updated });
  }
  function addExpBullet(expIdx: number) {
    const updated = [...experience];
    updated[expIdx] = { ...updated[expIdx], bullets: [...updated[expIdx].bullets, ""] };
    onChange({ experience: updated });
  }
  function removeExpBullet(expIdx: number, bulletIdx: number) {
    const updated = [...experience];
    const bullets = updated[expIdx].bullets.filter((_, i) => i !== bulletIdx);
    updated[expIdx] = { ...updated[expIdx], bullets };
    onChange({ experience: updated });
  }

  // ── Education helpers ──
  function addEdu() {
    onChange({ education: [...education, emptyEdu()] });
  }
  function removeEdu(i: number) {
    onChange({ education: education.filter((_, idx) => idx !== i) });
  }
  function updateEdu(i: number, partial: Partial<EducationEntry>) {
    const updated = [...education];
    updated[i] = { ...updated[i], ...partial };
    onChange({ education: updated });
  }

  // ── Projects helpers ──
  function addProject() {
    onChange({ projects: [...projects, emptyProject()] });
  }
  function removeProject(i: number) {
    onChange({ projects: projects.filter((_, idx) => idx !== i) });
  }
  function updateProject(i: number, partial: Partial<ProjectEntry>) {
    const updated = [...projects];
    updated[i] = { ...updated[i], ...partial };
    onChange({ projects: updated });
  }
  function updateProjectBullet(projIdx: number, bulletIdx: number, value: string) {
    const updated = [...projects];
    const bullets = [...updated[projIdx].bullets];
    bullets[bulletIdx] = value;
    updated[projIdx] = { ...updated[projIdx], bullets };
    onChange({ projects: updated });
  }
  function addProjectBullet(projIdx: number) {
    const updated = [...projects];
    updated[projIdx] = { ...updated[projIdx], bullets: [...updated[projIdx].bullets, ""] };
    onChange({ projects: updated });
  }

  // ── Certifications helpers ──
  function addCert() {
    onChange({ certifications: [...certifications, emptyCert()] });
  }
  function removeCert(i: number) {
    onChange({ certifications: certifications.filter((_, idx) => idx !== i) });
  }
  function updateCert(i: number, partial: Partial<CertEntry>) {
    const updated = [...certifications];
    updated[i] = { ...updated[i], ...partial };
    onChange({ certifications: updated });
  }

  return (
    <div className="space-y-4">
      {/* Contact Info */}
      <Section title="Contact Information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name *" id="ci-name" value={contactInfo.name} onChange={(v) => setContact({ name: v })} placeholder="Jane Smith" />
          <Field label="Email *" id="ci-email" value={contactInfo.email} onChange={(v) => setContact({ email: v })} placeholder="jane@example.com" />
          <Field label="Phone" id="ci-phone" value={contactInfo.phone} onChange={(v) => setContact({ phone: v })} placeholder="+1-555-000-0000" />
          <Field label="Location" id="ci-location" value={contactInfo.location} onChange={(v) => setContact({ location: v })} placeholder="Columbus, OH" />
          <Field label="LinkedIn URL" id="ci-linkedin" value={contactInfo.linkedin} onChange={(v) => setContact({ linkedin: v })} placeholder="linkedin.com/in/..." />
          <Field label="GitHub URL" id="ci-github" value={contactInfo.github} onChange={(v) => setContact({ github: v })} placeholder="github.com/..." />
          <Field label="Website / Portfolio" id="ci-website" value={contactInfo.website} onChange={(v) => setContact({ website: v })} placeholder="yoursite.com" />
        </div>
      </Section>

      {/* Summary */}
      <Section title="Professional Summary">
        <Textarea
          placeholder="A brief 2–3 sentence summary of your experience and what you bring to the table..."
          rows={4}
          value={summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          className="text-sm"
        />
      </Section>

      {/* Skills */}
      <Section title="Skills (comma-separated)">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["technical", "Programming Languages"],
              ["frameworks", "Frameworks & Libraries"],
              ["tools", "Tools & Platforms"],
              ["languages", "Spoken Languages"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={skills[key]}
                onChange={(e) => setSkills({ [key]: e.target.value })}
                placeholder={key === "languages" ? "English, Spanish" : "TypeScript, Python, Go"}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Experience */}
      <Section title="Work Experience">
        <div className="space-y-4">
          {experience.map((exp, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <span className="text-sm font-medium">Position {i + 1}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeExp(i)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Company" id={`exp-${i}-co`} value={exp.company} onChange={(v) => updateExp(i, { company: v })} placeholder="Acme Corp" />
                <Field label="Job Title" id={`exp-${i}-title`} value={exp.title} onChange={(v) => updateExp(i, { title: v })} placeholder="Software Engineer" />
                <Field label="Location" id={`exp-${i}-loc`} value={exp.location} onChange={(v) => updateExp(i, { location: v })} placeholder="Columbus, OH" />
                <div className="grid grid-cols-2 gap-2 col-span-2">
                  <Field label="Start (YYYY-MM)" id={`exp-${i}-start`} value={exp.startDate} onChange={(v) => updateExp(i, { startDate: v })} placeholder="2022-06" />
                  <Field label="End (YYYY-MM or blank)" id={`exp-${i}-end`} value={exp.endDate} onChange={(v) => updateExp(i, { endDate: v })} placeholder="Present" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Bullet Points</Label>
                {exp.bullets.map((b, bi) => (
                  <div key={bi} className="flex gap-2">
                    <Input
                      value={b}
                      onChange={(e) => updateExpBullet(i, bi, e.target.value)}
                      placeholder="Describe an achievement or responsibility..."
                      className="h-8 text-sm flex-1"
                    />
                    {exp.bullets.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExpBullet(i, bi)}
                        className="h-8 w-8 p-0 text-muted-foreground shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addExpBullet(i)}>
                  <Plus className="h-3 w-3" /> Add bullet
                </Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addExp} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Position
          </Button>
        </div>
      </Section>

      {/* Education */}
      <Section title="Education">
        <div className="space-y-4">
          {education.map((edu, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">School {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => removeEdu(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="School" id={`edu-${i}-school`} value={edu.school} onChange={(v) => updateEdu(i, { school: v })} placeholder="Ohio Wesleyan University" />
                <Field label="Degree" id={`edu-${i}-degree`} value={edu.degree} onChange={(v) => updateEdu(i, { degree: v })} placeholder="B.S. Computer Science" />
                <Field label="Field of Study" id={`edu-${i}-field`} value={edu.field} onChange={(v) => updateEdu(i, { field: v })} placeholder="Computer Science" />
                <Field label="GPA" id={`edu-${i}-gpa`} value={edu.gpa} onChange={(v) => updateEdu(i, { gpa: v })} placeholder="3.8" />
                <Field label="Start (YYYY-MM)" id={`edu-${i}-start`} value={edu.startDate} onChange={(v) => updateEdu(i, { startDate: v })} placeholder="2020-09" />
                <Field label="End (YYYY-MM)" id={`edu-${i}-end`} value={edu.endDate} onChange={(v) => updateEdu(i, { endDate: v })} placeholder="2024-05" />
                <div className="col-span-2">
                  <Field label="Honors / Awards" id={`edu-${i}-honors`} value={edu.honors} onChange={(v) => updateEdu(i, { honors: v })} placeholder="Dean's List, Summa Cum Laude" />
                </div>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addEdu} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Education
          </Button>
        </div>
      </Section>

      {/* Projects */}
      <Section title="Projects">
        <div className="space-y-4">
          {projects.map((proj, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Project {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => removeProject(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Project Name" id={`proj-${i}-name`} value={proj.name} onChange={(v) => updateProject(i, { name: v })} placeholder="JobPilot" />
                <Field label="Tech Stack" id={`proj-${i}-tech`} value={proj.tech} onChange={(v) => updateProject(i, { tech: v })} placeholder="Next.js, Prisma, tRPC" />
                <Field label="URL / Repo" id={`proj-${i}-url`} value={proj.url} onChange={(v) => updateProject(i, { url: v })} placeholder="github.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={proj.description}
                  onChange={(e) => updateProject(i, { description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Bullet Points</Label>
                {proj.bullets.map((b, bi) => (
                  <Input
                    key={bi}
                    value={b}
                    onChange={(e) => updateProjectBullet(i, bi, e.target.value)}
                    placeholder="Describe a key achievement..."
                    className="h-8 text-sm"
                  />
                ))}
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addProjectBullet(i)}>
                  <Plus className="h-3 w-3" /> Add bullet
                </Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addProject} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Project
          </Button>
        </div>
      </Section>

      {/* Certifications */}
      <Section title="Certifications">
        <div className="space-y-3">
          {certifications.map((cert, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Certification {i + 1}</span>
                <Button size="sm" variant="ghost" onClick={() => removeCert(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name" id={`cert-${i}-name`} value={cert.name} onChange={(v) => updateCert(i, { name: v })} placeholder="AWS Certified Developer" />
                <Field label="Issuer" id={`cert-${i}-issuer`} value={cert.issuer} onChange={(v) => updateCert(i, { issuer: v })} placeholder="Amazon Web Services" />
                <Field label="Date" id={`cert-${i}-date`} value={cert.date} onChange={(v) => updateCert(i, { date: v })} placeholder="2024-03" />
                <Field label="URL" id={`cert-${i}-url`} value={cert.url} onChange={(v) => updateCert(i, { url: v })} placeholder="credly.com/..." />
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addCert} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Certification
          </Button>
        </div>
      </Section>

      <Separator />
    </div>
  );
}
