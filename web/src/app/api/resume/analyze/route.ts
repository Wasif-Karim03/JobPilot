import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { analyzeResume } from "@/lib/resume-analyzer";

/**
 * POST /api/resume/analyze
 * Analyzes a resume with AI (Gemini) and stores the extracted profile.
 * Called automatically after every resume create/update.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resumeId } = await req.json().catch(() => ({}));
  if (!resumeId) return NextResponse.json({ error: "resumeId required" }, { status: 400 });

  // Fetch resume (verify ownership)
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId: session.user.id },
    select: {
      id: true,
      parsedContent: true,
      summary: true,
      skills: true,
      experience: true,
      education: true,
      projects: true,
      certifications: true,
      customSections: true,
    },
  });

  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  // Build full text from all available fields
  const textParts: string[] = [];
  if (resume.parsedContent) textParts.push(resume.parsedContent);
  if (resume.summary) textParts.push(resume.summary);

  if (resume.skills && typeof resume.skills === "object") {
    for (const val of Object.values(resume.skills as Record<string, unknown>)) {
      if (Array.isArray(val)) textParts.push(val.filter(Boolean).join(", "));
    }
  }
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience as Record<string, unknown>[]) {
      if (exp.title) textParts.push(String(exp.title));
      if (exp.company) textParts.push(String(exp.company));
      if (Array.isArray(exp.bullets)) textParts.push((exp.bullets as string[]).join(". "));
    }
  }
  if (Array.isArray(resume.projects)) {
    for (const p of resume.projects as Record<string, unknown>[]) {
      if (p.description) textParts.push(String(p.description));
      if (Array.isArray(p.tech)) textParts.push((p.tech as string[]).join(", "));
      if (Array.isArray(p.bullets)) textParts.push((p.bullets as string[]).join(". "));
    }
  }

  const fullText = textParts.filter(Boolean).join("\n");
  if (!fullText.trim()) {
    return NextResponse.json({ error: "No resume content to analyze" }, { status: 400 });
  }

  // Run analysis
  const analysis = await analyzeResume(fullText);

  // Preserve any existing user-created custom sections, merge in _analysis
  const existingCustom = (resume.customSections as Record<string, unknown> | null) ?? {};
  const updatedCustom = { ...existingCustom, _analysis: analysis };

  // Save analysis to resume
  await prisma.resume.update({
    where: { id: resumeId },
    data: { customSections: JSON.parse(JSON.stringify(updatedCustom)) },
  });

  return NextResponse.json({
    success: true,
    analysis: {
      keywords: analysis.keywords.length,
      skills: analysis.skills.length,
      jobTitles: analysis.jobTitles,
      experienceLevel: analysis.experienceLevel,
      industries: analysis.industries,
      yearsOfExperience: analysis.yearsOfExperience,
    },
  });
}
