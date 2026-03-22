import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

export const gmailRouter = createTRPCRouter({
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const connection = await ctx.prisma.gmailConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { gmailEmail: true, lastScanAt: true, isActive: true },
    });

    return {
      connected: !!connection?.isActive,
      email: connection?.gmailEmail ?? null,
      lastScanAt: connection?.lastScanAt ?? null,
      isActive: connection?.isActive ?? false,
    };
  }),

  initiateOAuth: protectedProcedure.mutation(async ({ ctx }) => {
    // Build Google OAuth URL for Gmail read-only scope
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`,
      response_type: "code",
      scope: [
        "openid",
        "email",
        process.env.GMAIL_SCOPES ?? "https://www.googleapis.com/auth/gmail.readonly",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state: ctx.user.id,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { authUrl };
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.gmailConnection.deleteMany({ where: { userId: ctx.user.id } });
    return { success: true };
  }),

  triggerScan: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await ctx.prisma.gmailConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { isActive: true },
    });

    if (!connection?.isActive) {
      return { success: false, error: "No active Gmail connection" };
    }

    // Worker will pick up this signal — for now just return ok
    // In Phase H this will enqueue a BullMQ job
    return { success: true };
  }),

  getRecentScans: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).optional().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.emailScan.findMany({
        where: { userId: ctx.user.id },
        orderBy: { scannedAt: "desc" },
        take: input.limit,
      });
    }),
});
