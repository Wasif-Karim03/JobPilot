import { z } from "zod";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { createResumeSchema, updateResumeSchema } from "@/lib/validations";

// Convert null to Prisma.DbNull for nullable JSON fields
function jsonOrNull(v: unknown) {
  return v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue | undefined);
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
    return ctx.prisma.resume.create({
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
        parsedContent: input.parsedContent,
      },
    });
  }),

  update: protectedProcedure.input(updateResumeSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const resume = await ctx.prisma.resume.findFirst({
      where: { id, userId: ctx.user.id },
    });
    if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });

    return ctx.prisma.resume.update({
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
        ...(data.certifications !== undefined && {
          certifications: jsonOrNull(data.certifications),
        }),
        ...(data.customSections !== undefined && {
          customSections: jsonOrNull(data.customSections),
        }),
        ...(data.richTextContent !== undefined && {
          richTextContent: jsonOrNull(data.richTextContent),
        }),
        ...(data.parsedContent !== undefined && { parsedContent: data.parsedContent }),
        version: { increment: 1 },
      },
    });
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
});
