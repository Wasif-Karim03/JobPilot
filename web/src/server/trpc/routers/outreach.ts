import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { updateOutreachDraftSchema } from "@/lib/validations";
import { LINKEDIN_NOTE_MAX_CHARS } from "@/lib/constants";

export const outreachRouter = createTRPCRouter({
  getContactsForJob: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Verify job belongs to user
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.jobId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      return ctx.prisma.jobContact.findMany({
        where: { jobId: input.jobId },
        include: { outreachDrafts: { orderBy: { createdAt: "desc" } } },
        orderBy: { outreachPriority: "desc" },
      });
    }),

  getAllContacts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["DRAFT", "SENT", "REPLIED", "NO_RESPONSE"]).optional(),
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      // Get all contacts for jobs owned by this user
      const userJobIds = await ctx.prisma.job
        .findMany({
          where: { userId: ctx.user.id },
          select: { id: true },
        })
        .then((jobs) => jobs.map((j) => j.id));

      const draftFilter = input.status
        ? { outreachDrafts: { some: { status: input.status } } }
        : {};

      const [contacts, totalCount] = await Promise.all([
        ctx.prisma.jobContact.findMany({
          where: { jobId: { in: userJobIds }, ...draftFilter },
          include: {
            outreachDrafts: {
              ...(input.status && { where: { status: input.status } }),
              orderBy: { createdAt: "desc" },
            },
            job: { select: { id: true, title: true, company: true } },
          },
          orderBy: { outreachPriority: "desc" },
          skip,
          take: input.pageSize,
        }),
        ctx.prisma.jobContact.count({
          where: { jobId: { in: userJobIds }, ...draftFilter },
        }),
      ]);

      return { contacts, totalCount };
    }),

  generateDraft: protectedProcedure
    .input(z.object({ contactId: z.string().min(1), type: z.enum(["EMAIL", "LINKEDIN"]) }))
    .mutation(async ({ ctx, input }) => {
      // Verify contact belongs to a job owned by this user
      const contact = await ctx.prisma.jobContact.findFirst({
        where: { id: input.contactId },
        include: { job: { select: { userId: true, title: true, company: true } } },
      });

      if (!contact || contact.job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
      }

      // Check user has API key
      const apiConfig = await ctx.prisma.userApiConfig.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });
      if (!apiConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Configure your Claude API key to generate outreach drafts",
        });
      }

      // Placeholder content — real generation happens in worker
      const isLinkedIn = input.type === "LINKEDIN";
      const subject = isLinkedIn
        ? undefined
        : `Interest in ${contact.job.title} at ${contact.job.company}`;
      const content = isLinkedIn
        ? `Hi ${contact.name.split(" ")[0]}, I noticed your work at ${contact.job.company} and I'm interested in the ${contact.job.title} role. Would love to connect!`
        : `Hi ${contact.name.split(" ")[0]},\n\nI came across the ${contact.job.title} opening at ${contact.job.company} and I'm very interested. I'd love to learn more about the team and role.\n\nBest regards`;

      return ctx.prisma.outreachDraft.create({
        data: {
          contactId: input.contactId,
          type: input.type,
          subject,
          content: isLinkedIn ? content.slice(0, LINKEDIN_NOTE_MAX_CHARS) : content,
          status: "DRAFT",
        },
      });
    }),

  updateDraft: protectedProcedure
    .input(updateOutreachDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.prisma.outreachDraft.findFirst({
        where: { id: input.id },
        include: {
          contact: {
            include: { job: { select: { userId: true } } },
          },
        },
      });

      if (!draft || draft.contact.job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }

      // Enforce LinkedIn character limit
      if (draft.type === "LINKEDIN" && input.content.length > LINKEDIN_NOTE_MAX_CHARS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `LinkedIn notes must be ${LINKEDIN_NOTE_MAX_CHARS} characters or less`,
        });
      }

      return ctx.prisma.outreachDraft.update({
        where: { id: input.id },
        data: {
          content: input.content,
          ...(input.subject !== undefined && { subject: input.subject }),
        },
      });
    }),

  markSent: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.prisma.outreachDraft.findFirst({
        where: { id: input.id },
        include: { contact: { include: { job: { select: { userId: true } } } } },
      });

      if (!draft || draft.contact.job.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }

      return ctx.prisma.outreachDraft.update({
        where: { id: input.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }),
});
