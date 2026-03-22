import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { createApplicationSchema, updateApplicationStatusSchema } from "@/lib/validations";

export const applicationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "DISCOVERED",
            "BOOKMARKED",
            "APPLYING",
            "APPLIED",
            "PHONE_SCREEN",
            "INTERVIEW",
            "OFFER",
            "REJECTED",
            "WITHDRAWN",
            "ARCHIVED",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.application.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.status && { status: input.status }),
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              matchScore: true,
              url: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  create: protectedProcedure.input(createApplicationSchema).mutation(async ({ ctx, input }) => {
    // Verify job belongs to user
    const job = await ctx.prisma.job.findFirst({
      where: { id: input.jobId, userId: ctx.user.id },
    });
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

    const now = new Date();
    const historyEntry = {
      status: "APPLIED",
      date: now.toISOString(),
      source: "manual",
      notes: input.notes ?? undefined,
    };

    const [application] = await Promise.all([
      ctx.prisma.application.create({
        data: {
          jobId: input.jobId,
          userId: ctx.user.id,
          status: "APPLIED",
          appliedDate: input.appliedDate ? new Date(input.appliedDate) : now,
          appliedVia: input.appliedVia ?? null,
          resumeUsed: input.resumeUsed ?? null,
          notes: input.notes ?? null,
          statusHistory: [historyEntry],
        },
        include: { job: { select: { id: true, title: true, company: true } } },
      }),
      ctx.prisma.job.update({
        where: { id: input.jobId },
        data: { status: "APPLIED" },
      }),
    ]);

    return application;
  }),

  updateStatus: protectedProcedure
    .input(updateApplicationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      const history = Array.isArray(application.statusHistory)
        ? (application.statusHistory as object[])
        : [];

      const historyEntry = {
        status: input.status,
        date: new Date().toISOString(),
        source: "manual",
        ...(input.notes && { notes: input.notes }),
      };

      const [updated] = await Promise.all([
        ctx.prisma.application.update({
          where: { id: input.id },
          data: {
            status: input.status,
            statusHistory: [...history, historyEntry],
          },
          include: { job: { select: { id: true, title: true, company: true } } },
        }),
        ctx.prisma.job.update({
          where: { id: application.jobId },
          data: { status: input.status },
        }),
      ]);

      return updated;
    }),

  addNote: protectedProcedure
    .input(z.object({ id: z.string().min(1), notes: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      return ctx.prisma.application.update({
        where: { id: input.id },
        data: { notes: input.notes },
      });
    }),

  getKanbanData: protectedProcedure.query(async ({ ctx }) => {
    const applications = await ctx.prisma.application.findMany({
      where: { userId: ctx.user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            matchScore: true,
            url: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Group by status
    const columns: Record<string, typeof applications> = {
      APPLYING: [],
      APPLIED: [],
      PHONE_SCREEN: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };

    for (const app of applications) {
      const col = app.status as string;
      if (col in columns) {
        columns[col].push(app);
      }
    }

    return { columns };
  }),
});
