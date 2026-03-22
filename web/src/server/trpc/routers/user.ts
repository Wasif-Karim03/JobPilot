import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { updateProfileSchema, deleteAccountSchema } from "@/lib/validations";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        onboardingComplete: true,
        createdAt: true,
      },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  }),

  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    return ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        onboardingComplete: true,
      },
    });
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.user.id },
      data: { onboardingComplete: true },
    });
    return { success: true };
  }),

  deleteAccount: protectedProcedure.input(deleteAccountSchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { email: true },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    if (user.email !== input.confirmEmail) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email does not match your account",
      });
    }

    // Cascade delete handles all related data
    await ctx.prisma.user.delete({ where: { id: ctx.user.id } });
    return { success: true };
  }),

  // Used by onboarding and settings pages
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { onboardingComplete: true },
    });
    const apiConfig = await ctx.prisma.userApiConfig.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true },
    });
    const preferences = await ctx.prisma.jobPreferences.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true },
    });
    const masterResume = await ctx.prisma.resume.findFirst({
      where: { userId: ctx.user.id, isMaster: true },
      select: { id: true },
    });
    const gmailConnection = await ctx.prisma.gmailConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, isActive: true },
    });

    return {
      onboardingComplete: user?.onboardingComplete ?? false,
      hasApiKey: !!apiConfig,
      hasPreferences: !!preferences,
      hasMasterResume: !!masterResume,
      hasGmail: !!gmailConnection?.isActive,
    };
  }),
});
