import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { jobListSchema, triggerSearchSchema } from "@/lib/validations";

export const jobRouter = createTRPCRouter({
  list: protectedProcedure.input(jobListSchema).query(async ({ ctx, input }) => {
    const {
      status,
      minMatchScore,
      maxMatchScore,
      company,
      search,
      sortBy = "discoveredAt",
      sortDir = "desc",
      page,
      pageSize,
    } = input;

    const where = {
      userId: ctx.user.id,
      isHidden: false,
      ...(status && { status }),
      ...(minMatchScore !== undefined && { matchScore: { gte: minMatchScore } }),
      ...(maxMatchScore !== undefined && {
        matchScore: {
          ...(minMatchScore !== undefined ? { gte: minMatchScore } : {}),
          lte: maxMatchScore,
        },
      }),
      ...(company && { company: { contains: company, mode: "insensitive" as const } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
          { location: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const orderBy =
      sortBy === "matchScore"
        ? { matchScore: sortDir as "asc" | "desc" }
        : sortBy === "company"
          ? { company: sortDir as "asc" | "desc" }
          : { discoveredAt: sortDir as "asc" | "desc" };

    const skip = (page - 1) * pageSize;

    const [jobs, totalCount] = await Promise.all([
      ctx.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          url: true,
          source: true,
          salaryRange: true,
          matchScore: true,
          missingKeywords: true,
          status: true,
          discoveredAt: true,
          updatedAt: true,
          userNotes: true,
        },
      }),
      ctx.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          contacts: {
            include: { outreachDrafts: true },
            orderBy: { outreachPriority: "desc" },
          },
          application: true,
          tailoredResumes: {
            select: { id: true, createdAt: true, pdfUrl: true },
          },
          searchRun: {
            select: { id: true, searchDepth: true, createdAt: true },
          },
        },
      });

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      return job;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum([
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
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  updateNotes: protectedProcedure
    .input(z.object({ id: z.string().min(1), notes: z.string().max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { userNotes: input.notes },
      });
    }),

  hide: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      await ctx.prisma.job.update({
        where: { id: input.id },
        data: { isHidden: true, status: "ARCHIVED" },
      });
      return { success: true };
    }),

  triggerSearch: protectedProcedure.input(triggerSearchSchema).mutation(async ({ ctx, input }) => {
    // Check user has API key configured
    const apiConfig = await ctx.prisma.userApiConfig.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, searchDepth: true },
    });

    if (!apiConfig) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Configure your Claude API key before triggering a search",
      });
    }

    // Create search run (worker will pick it up)
    const searchRun = await ctx.prisma.searchRun.create({
      data: {
        userId: ctx.user.id,
        searchDepth: input.depth ?? apiConfig.searchDepth,
        status: "QUEUED",
      },
    });

    return { searchRunId: searchRun.id };
  }),

  getSearchHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).optional().default(1),
        pageSize: z.number().int().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;

      const [runs, totalCount] = await Promise.all([
        ctx.prisma.searchRun.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: "desc" },
          skip,
          take: input.pageSize,
        }),
        ctx.prisma.searchRun.count({ where: { userId: ctx.user.id } }),
      ]);

      return { runs, totalCount };
    }),

  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [totalJobs, newJobsToday, highMatchJobs, applicationCount, lastSearchRun] =
      await Promise.all([
        ctx.prisma.job.count({ where: { userId, isHidden: false } }),
        ctx.prisma.job.count({
          where: {
            userId,
            isHidden: false,
            discoveredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        ctx.prisma.job.count({
          where: { userId, isHidden: false, matchScore: { gte: 80 } },
        }),
        ctx.prisma.application.count({ where: { userId } }),
        ctx.prisma.searchRun.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { status: true, createdAt: true, jobsFound: true },
        }),
      ]);

    const topJobs = await ctx.prisma.job.findMany({
      where: { userId, isHidden: false, matchScore: { gte: 80 } },
      orderBy: { matchScore: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        matchScore: true,
        status: true,
        discoveredAt: true,
      },
    });

    return {
      totalJobs,
      newJobsToday,
      highMatchJobs,
      applicationCount,
      lastSearchRun,
      topJobs,
    };
  }),
});
