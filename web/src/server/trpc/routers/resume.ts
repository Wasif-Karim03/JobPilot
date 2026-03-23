import { z } from "zod";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { createResumeSchema, updateResumeSchema } from "@/lib/validations";
import { TECH_POOL } from "@/lib/tech-pool";
import { analyzeResume } from "@/lib/resume-analyzer";

// Trigger background analysis — fire-and-forget (don't await, don't fail the save)
async function triggerAnalysis(resumeId: string, fullText: string, userId?: string) {
  if (!fullText?.trim()) return;
  try {
    const { prisma } = await import("@/server/db");

    // Fetch user's stated job preferences so AI knows what roles they're targeting
    let userPrefs: string[] = [];
    if (userId) {
      const prefs = await prisma.jobPreferences.findUnique({
        where: { userId },
        select: { targetTitles: true },
      });
      userPrefs = prefs?.targetTitles ?? [];
    }

    const analysis = await analyzeResume(fullText, userPrefs);
    const existing = await prisma.resume.findUnique({ where: { id: resumeId }, select: { customSections: true } });
    const existingCustom = (existing?.customSections as Record<string, unknown> | null) ?? {};
    await prisma.resume.update({
      where: { id: resumeId },
      data: { customSections: JSON.parse(JSON.stringify({ ...existingCustom, _analysis: analysis })) },
    });
    console.log(`[resume] Analysis complete for ${resumeId}: domain="${analysis.domain}", ${analysis.keywords.length} keywords, ${analysis.jobTitles.length} job titles`);
  } catch (err) {
    console.error("[resume] Analysis failed (non-fatal):", err instanceof Error ? err.message : err);
  }
}

// Convert null to Prisma.DbNull for nullable JSON fields
function jsonOrNull(v: unknown) {
  return v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue | undefined);
}

// Auto-build parsedContent from structured fields so search always has text to analyze
function buildParsedContent(data: {
  summary?: string | null;
  skills?: unknown;
  experience?: unknown;
  education?: unknown;
  projects?: unknown;
  certifications?: unknown;
}): string {
  const parts: string[] = [];
  if (data.summary) parts.push(data.summary);

  if (data.skills && typeof data.skills === "object") {
    for (const val of Object.values(data.skills as Record<string, unknown>)) {
      if (Array.isArray(val)) parts.push(val.filter(Boolean).join(" "));
    }
  }
  if (Array.isArray(data.experience)) {
    for (const exp of data.experience as Record<string, unknown>[]) {
      if (exp.title) parts.push(String(exp.title));
      if (exp.company) parts.push(String(exp.company));
      if (Array.isArray(exp.bullets)) parts.push((exp.bullets as string[]).filter(Boolean).join(" "));
    }
  }
  if (Array.isArray(data.education)) {
    for (const edu of data.education as Record<string, unknown>[]) {
      if (edu.school) parts.push(String(edu.school));
      if (edu.degree) parts.push(String(edu.degree));
      if (edu.field) parts.push(String(edu.field));
    }
  }
  if (Array.isArray(data.projects)) {
    for (const p of data.projects as Record<string, unknown>[]) {
      if (p.name) parts.push(String(p.name));
      if (p.description) parts.push(String(p.description));
      if (Array.isArray(p.tech)) parts.push((p.tech as string[]).filter(Boolean).join(" "));
      if (Array.isArray(p.bullets)) parts.push((p.bullets as string[]).filter(Boolean).join(" "));
    }
  }
  if (Array.isArray(data.certifications)) {
    for (const c of data.certifications as Record<string, unknown>[]) {
      if (c.name) parts.push(String(c.name));
    }
  }
  return parts.filter(Boolean).join("\n");
}

// Extract keywords the system detected in this resume (for display)
function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return TECH_POOL.filter((t) => lower.includes(t));
}

export const resumeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.resume.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        title: true,
        isMaster: true,
        format: true,
        version: true,
        pdfUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isMaster: "desc" }, { updatedAt: "desc" }],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          tailoredFor: {
            select: { id: true, jobId: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
      return resume;
    }),

  create: protectedProcedure.input(createResumeSchema).mutation(async ({ ctx, input }) => {
    const autoParsed = buildParsedContent({
      summary: input.summary, skills: input.skills, experience: input.experience,
      education: input.education, projects: input.projects, certifications: input.certifications,
    });

    const resume = await ctx.prisma.resume.create({
      data: {
        userId: ctx.user.id,
        title: input.title,
        format: input.format,
        contactInfo: jsonOrNull(input.contactInfo),
        summary: input.summary,
        experience: jsonOrNull(input.experience),
        education: jsonOrNull(input.education),
        skills: jsonOrNull(input.skills),
        projects: jsonOrNull(input.projects),
        certifications: jsonOrNull(input.certifications),
        customSections: jsonOrNull(input.customSections),
        richTextContent: jsonOrNull(input.richTextContent),
        parsedContent: input.parsedContent || autoParsed || null,
      },
    });

    // Trigger AI analysis in background (don't await — let the save succeed immediately)
    const textForAnalysis = input.parsedContent || autoParsed;
    if (textForAnalysis) void triggerAnalysis(resume.id, textForAnalysis, ctx.user.id);

    return resume;
  }),

  update: protectedProcedure.input(updateResumeSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const resume = await ctx.prisma.resume.findFirst({
      where: { id, userId: ctx.user.id },
    });
    if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });

    // Auto-rebuild parsedContent whenever structured fields change
    const needsRebuild = data.summary !== undefined || data.experience !== undefined ||
      data.education !== undefined || data.skills !== undefined ||
      data.projects !== undefined || data.certifications !== undefined;

    let autoParsed: string | undefined;
    if (needsRebuild && data.parsedContent === undefined) {
      // Fetch current values to merge with incoming changes
      const current = await ctx.prisma.resume.findUnique({
        where: { id },
        select: { summary: true, skills: true, experience: true, education: true, projects: true, certifications: true },
      });
      autoParsed = buildParsedContent({
        summary: data.summary ?? current?.summary,
        skills: data.skills ?? current?.skills,
        experience: data.experience ?? current?.experience,
        education: data.education ?? current?.education,
        projects: data.projects ?? current?.projects,
        certifications: data.certifications ?? current?.certifications,
      });
    }

    const updated = await ctx.prisma.resume.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.format !== undefined && { format: data.format }),
        ...(data.contactInfo !== undefined && { contactInfo: jsonOrNull(data.contactInfo) }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.experience !== undefined && { experience: jsonOrNull(data.experience) }),
        ...(data.education !== undefined && { education: jsonOrNull(data.education) }),
        ...(data.skills !== undefined && { skills: jsonOrNull(data.skills) }),
        ...(data.projects !== undefined && { projects: jsonOrNull(data.projects) }),
        ...(data.certifications !== undefined && { certifications: jsonOrNull(data.certifications) }),
        ...(data.customSections !== undefined && { customSections: jsonOrNull(data.customSections) }),
        ...(data.richTextContent !== undefined && { richTextContent: jsonOrNull(data.richTextContent) }),
        parsedContent: data.parsedContent ?? autoParsed ?? undefined,
        version: { increment: 1 },
      },
    });

    // Trigger AI analysis in background after update (don't await)
    const textForAnalysis = data.parsedContent ?? autoParsed;
    if (textForAnalysis) void triggerAnalysis(id, textForAnalysis, ctx.user.id);

    return updated;
  }),

  setMaster: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });

      // Unset previous master, set new one
      await ctx.prisma.$transaction([
        ctx.prisma.resume.updateMany({
          where: { userId: ctx.user.id, isMaster: true },
          data: { isMaster: false },
        }),
        ctx.prisma.resume.update({
          where: { id: input.id },
          data: { isMaster: true },
        }),
      ]);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });

      if (resume.isMaster) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your master resume. Set another resume as master first.",
        });
      }

      await ctx.prisma.resume.delete({ where: { id: input.id } });
      return { success: true };
    }),

  getMasterResume: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.resume.findFirst({
      where: { userId: ctx.user.id, isMaster: true },
    });
  }),

  // Returns the keywords the system extracted from the user's master resume
  getKeywords: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { parsedContent: true, summary: true, skills: true, experience: true, projects: true },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });

      const text = [
        resume.parsedContent ?? "",
        resume.summary ?? "",
        // flatten skills JSON
        ...(resume.skills && typeof resume.skills === "object"
          ? Object.values(resume.skills as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : []))
          : []),
      ].join(" ");

      const detected = extractKeywords(text);
      return { keywords: detected };
    }),
});
