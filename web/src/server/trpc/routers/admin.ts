import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/trpc/init";
import { paginationSchema } from "@/lib/validations";

export const adminRouter = createTRPCRouter({
  getDashboard: adminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalJobs, totalSearchRuns, totalApplications, recentSignups] =
      await Promise.all([
        ctx.prisma.user.count(),
        ctx.prisma.user.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
        ctx.prisma.job.count(),
        ctx.prisma.searchRun.count(),
        ctx.prisma.application.count(),
        ctx.prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      totalJobs,
      totalSearchRuns,
      totalApplications,
      recentSignups,
      systemHealth: {
        dbStatus: "connected" as const,
        redisStatus: "unknown" as const,
        workerStatus: "unknown" as const,
      },
    };
  }),

  listUsers: adminProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = input.search
        ? {
            OR: [
              { email: { contains: input.search, mode: "insensitive" as const } },
              { name: { contains: input.search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [users, totalCount] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            onboardingComplete: true,
            createdAt: true,
            _count: {
              select: { jobs: true, applications: true, searchRuns: true },
            },
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
        totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(totalCount / input.pageSize),
      };
    }),

  getUserDetail: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
          preferences: true,
          apiConfig: {
            select: {
              researchModel: true,
              executionModel: true,
              searchDepth: true,
              dailySearchEnabled: true,
              updatedAt: true,
            },
          },
          _count: {
            select: { jobs: true, applications: true, searchRuns: true, resumes: true },
          },
        },
      });

      if (!user) return null;

      const recentSearchRuns = await ctx.prisma.searchRun.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return { user, recentSearchRuns };
    }),

  getQueueStats: adminProcedure.query(async () => {
    // Placeholder — real stats come from BullMQ in Phase H
    return {
      jobSearch: { waiting: 0, active: 0, completed: 0, failed: 0 },
      emailScan: { waiting: 0, active: 0, completed: 0, failed: 0 },
      companyIntel: { waiting: 0, active: 0, completed: 0, failed: 0 },
      matchAnalysis: { waiting: 0, active: 0, completed: 0, failed: 0 },
    };
  }),

  getSystemHealth: adminProcedure.query(async ({ ctx }) => {
    let dbStatus: "connected" | "error" = "error";
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }

    const lastSearchRun = await ctx.prisma.searchRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    });

    const failedRunsLast24h = await ctx.prisma.searchRun.count({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const totalRunsLast24h = await ctx.prisma.searchRun.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return {
      database: dbStatus,
      redis: "unknown" as const,
      worker: "unknown" as const,
      lastSearchRun: lastSearchRun?.createdAt ?? null,
      errorRate: totalRunsLast24h > 0 ? failedRunsLast24h / totalRunsLast24h : 0,
    };
  }),
});
