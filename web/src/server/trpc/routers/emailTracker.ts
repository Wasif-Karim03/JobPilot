import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const emailTrackerRouter = createTRPCRouter({
  // ─── Stats Overview ─────────────────────────────────────────────────────────

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [connection, scans] = await Promise.all([
      ctx.prisma.gmailConnection.findUnique({
        where: { userId },
        select: {
          gmailEmail: true,
          lastScanAt: true,
          isActive: true,
          jobSearchStartDate: true,
        },
      }),
      ctx.prisma.emailScan.findMany({
        where: { userId },
        select: { detectedStatus: true, detectedCompany: true },
      }),
    ]);

    const stats = {
      total: scans.length,
      applied: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
      pending: 0,
    };

    for (const scan of scans) {
      switch (scan.detectedStatus) {
        case "APPLIED":
          stats.applied++;
          break;
        case "PHONE_SCREEN":
        case "INTERVIEW":
          stats.interviews++;
          break;
        case "OFFER":
          stats.offers++;
          break;
        case "REJECTED":
          stats.rejected++;
          break;
        default:
          stats.pending++;
      }
    }

    return {
      ...stats,
      connected: !!connection?.isActive,
      email: connection?.gmailEmail ?? null,
      lastSyncAt: connection?.lastScanAt ?? null,
      startDate: connection?.jobSearchStartDate ?? null,
    };
  }),

  // ─── Set Job Search Start Date ───────────────────────────────────────────────

  setStartDate: protectedProcedure
    .input(z.object({ date: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.prisma.gmailConnection.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      });

      if (!connection) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connect your Gmail account first before setting a start date.",
        });
      }

      const startDate = new Date(input.date);
      if (isNaN(startDate.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date format." });
      }

      // Reset lastScanAt so the next scan covers everything from the start date
      await ctx.prisma.gmailConnection.update({
        where: { userId: ctx.user.id },
        data: { jobSearchStartDate: startDate, lastScanAt: null },
      });

      return { success: true };
    }),

  // ─── Get Tracked Emails ──────────────────────────────────────────────────────

  getTrackedEmails: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).optional().default(100),
        company: z.string().optional(),
        status: z
          .enum([
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
      return ctx.prisma.emailScan.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.company && {
            detectedCompany: { contains: input.company, mode: "insensitive" },
          }),
          ...(input.status && { detectedStatus: input.status }),
        },
        orderBy: [
          { emailDate: "desc" },
          { scannedAt: "desc" },
        ],
        take: input.limit,
        select: {
          id: true,
          gmailMessageId: true,
          subject: true,
          sender: true,
          bodySnippet: true,
          detectedCompany: true,
          detectedStatus: true,
          confidence: true,
          emailDate: true,
          scannedAt: true,
          linkedJobId: true,
          processed: true,
        },
      });
    }),

  // ─── Get Companies Summary ───────────────────────────────────────────────────
  // Returns one row per company with latest status + email count

  getCompaniesSummary: protectedProcedure.query(async ({ ctx }) => {
    const scans = await ctx.prisma.emailScan.findMany({
      where: {
        userId: ctx.user.id,
        detectedCompany: { not: null },
      },
      orderBy: [{ emailDate: "desc" }, { scannedAt: "desc" }],
      select: {
        id: true,
        detectedCompany: true,
        detectedStatus: true,
        subject: true,
        sender: true,
        bodySnippet: true,
        emailDate: true,
        scannedAt: true,
        confidence: true,
      },
    });

    type ScanEntry = (typeof scans)[number];

    // Group by company
    const companyMap = new Map<
      string,
      {
        company: string;
        latestStatus: string | null;
        emailCount: number;
        latestEmailDate: Date | null;
        emails: ScanEntry[];
      }
    >();

    for (const scan of scans) {
      const company = scan.detectedCompany!;
      if (!companyMap.has(company)) {
        companyMap.set(company, {
          company,
          latestStatus: null,
          emailCount: 0,
          latestEmailDate: null,
          emails: [],
        });
      }
      const entry = companyMap.get(company)!;
      entry.emailCount++;
      entry.emails.push(scan);

      // Track latest date
      const emailDate = scan.emailDate ?? scan.scannedAt;
      if (!entry.latestEmailDate || emailDate > entry.latestEmailDate) {
        entry.latestEmailDate = emailDate;
        // Latest email determines current status
        entry.latestStatus = scan.detectedStatus ?? null;
      }
    }

    return Array.from(companyMap.values()).sort(
      (a, b) =>
        (b.latestEmailDate?.getTime() ?? 0) - (a.latestEmailDate?.getTime() ?? 0)
    );
  }),

  // ─── Trigger Manual Sync ─────────────────────────────────────────────────────

  triggerSync: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [connection, apiConfig] = await Promise.all([
      ctx.prisma.gmailConnection.findUnique({
        where: { userId },
        select: { isActive: true, jobSearchStartDate: true },
      }),
      ctx.prisma.userApiConfig.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ]);

    if (!connection?.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Connect your Gmail account first.",
      });
    }

    if (!connection.jobSearchStartDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Set your job search start date before syncing.",
      });
    }

    if (!apiConfig) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Configure your Claude API key in Settings before syncing.",
      });
    }

    const { getEmailScanQueue } = await import("@/server/queue");
    const queue = getEmailScanQueue();

    const queueJob = await queue.add(
      "email-scan-manual",
      { userId },
      {
        attempts: 2,
        backoff: { type: "fixed", delay: 10000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );

    return { success: true, jobId: queueJob.id ?? "" };
  }),

  // ─── Poll sync job progress ──────────────────────────────────────────────────

  getSyncStatus: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ input }) => {
      const { getEmailScanQueue } = await import("@/server/queue");
      const queue = getEmailScanQueue();

      const job = await queue.getJob(input.jobId);
      if (!job) {
        return { state: "unknown" as const, percent: 0, message: "Job not found." };
      }

      const state = await job.getState();
      const raw = job.progress;

      // Progress is stored as { percent, message } object
      const percent =
        typeof raw === "object" && raw !== null && "percent" in raw
          ? Number((raw as { percent: number }).percent)
          : typeof raw === "number"
            ? raw
            : 0;

      const message =
        typeof raw === "object" && raw !== null && "message" in raw
          ? String((raw as { message: string }).message)
          : state === "completed"
            ? "Done!"
            : state === "failed"
              ? "Sync failed."
              : "Working…";

      return { state, percent, message };
    }),
});
