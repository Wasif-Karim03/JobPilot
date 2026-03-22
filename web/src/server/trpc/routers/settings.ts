import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { encrypt, decrypt } from "@/server/services/encryption";
import { setApiKeySchema, updateApiConfigSchema, updatePreferencesSchema } from "@/lib/validations";

export const settingsRouter = createTRPCRouter({
  // ────────────────────────────────────────────────────────
  // API KEY + CLAUDE CONFIG
  // ────────────────────────────────────────────────────────

  getApiConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.userApiConfig.findUnique({
      where: { userId: ctx.user.id },
      select: {
        // Never return the actual key
        id: true,
        researchModel: true,
        executionModel: true,
        searchDepth: true,
        dailySearchEnabled: true,
        maxDailyApiCost: true,
        updatedAt: true,
      },
    });

    return {
      hasApiKey: !!config,
      researchModel: config?.researchModel ?? "claude-opus-4-6",
      executionModel: config?.executionModel ?? "claude-sonnet-4-6",
      searchDepth: config?.searchDepth ?? "STANDARD",
      dailySearchEnabled: config?.dailySearchEnabled ?? true,
      maxDailyApiCost: config?.maxDailyApiCost ?? 10.0,
      updatedAt: config?.updatedAt,
    };
  }),

  setApiKey: protectedProcedure.input(setApiKeySchema).mutation(async ({ ctx, input }) => {
    const { encrypted, iv } = encrypt(input.apiKey);

    await ctx.prisma.userApiConfig.upsert({
      where: { userId: ctx.user.id },
      create: {
        userId: ctx.user.id,
        claudeApiKeyEncrypted: encrypted,
        claudeApiKeyIv: iv,
      },
      update: {
        claudeApiKeyEncrypted: encrypted,
        claudeApiKeyIv: iv,
      },
    });

    return { success: true };
  }),

  validateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const config = await ctx.prisma.userApiConfig.findUnique({
      where: { userId: ctx.user.id },
      select: { claudeApiKeyEncrypted: true, claudeApiKeyIv: true },
    });

    if (!config) {
      return { valid: false, error: "No API key configured" };
    }

    try {
      const apiKey = decrypt(config.claudeApiKeyEncrypted, config.claudeApiKeyIv);

      // Make a minimal API call to verify the key
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (response.status === 401) return { valid: false, error: "Invalid API key" };
      if (response.status === 400) return { valid: true }; // Expected for minimal call
      if (response.ok) return { valid: true };

      return { valid: false, error: `API returned status ${response.status}` };
    } catch {
      return { valid: false, error: "Failed to validate key" };
    }
  }),

  updateApiConfig: protectedProcedure
    .input(updateApiConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.userApiConfig.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Set your API key before updating config",
        });
      }

      return ctx.prisma.userApiConfig.update({
        where: { userId: ctx.user.id },
        data: {
          ...(input.researchModel && { researchModel: input.researchModel }),
          ...(input.executionModel && { executionModel: input.executionModel }),
          ...(input.searchDepth && { searchDepth: input.searchDepth }),
          ...(input.dailySearchEnabled !== undefined && {
            dailySearchEnabled: input.dailySearchEnabled,
          }),
          ...(input.maxDailyApiCost !== undefined && { maxDailyApiCost: input.maxDailyApiCost }),
        },
        select: {
          researchModel: true,
          executionModel: true,
          searchDepth: true,
          dailySearchEnabled: true,
          maxDailyApiCost: true,
        },
      });
    }),

  // ────────────────────────────────────────────────────────
  // JOB PREFERENCES
  // ────────────────────────────────────────────────────────

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobPreferences.findUnique({
      where: { userId: ctx.user.id },
    });
  }),

  updatePreferences: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate salary range if both provided
      if (
        input.salaryMin !== undefined &&
        input.salaryMax !== undefined &&
        input.salaryMin !== null &&
        input.salaryMax !== null &&
        input.salaryMin > input.salaryMax
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum salary must be less than maximum salary",
        });
      }

      return ctx.prisma.jobPreferences.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          targetTitles: input.targetTitles ?? [],
          targetLocations: input.targetLocations ?? [],
          remotePreference: input.remotePreference ?? "any",
          salaryMin: input.salaryMin ?? null,
          salaryMax: input.salaryMax ?? null,
          companySizes: input.companySizes ?? [],
          industries: input.industries ?? [],
          excludeCompanies: input.excludeCompanies ?? [],
          experienceLevel: input.experienceLevel ?? "entry",
          visaSponsorship: input.visaSponsorship ?? false,
          keywords: input.keywords ?? [],
          searchTime: input.searchTime ?? "08:00",
          timezone: input.timezone ?? "America/New_York",
        },
        update: {
          ...(input.targetTitles !== undefined && { targetTitles: input.targetTitles }),
          ...(input.targetLocations !== undefined && { targetLocations: input.targetLocations }),
          ...(input.remotePreference !== undefined && { remotePreference: input.remotePreference }),
          ...(input.salaryMin !== undefined && { salaryMin: input.salaryMin }),
          ...(input.salaryMax !== undefined && { salaryMax: input.salaryMax }),
          ...(input.companySizes !== undefined && { companySizes: input.companySizes }),
          ...(input.industries !== undefined && { industries: input.industries }),
          ...(input.excludeCompanies !== undefined && {
            excludeCompanies: input.excludeCompanies,
          }),
          ...(input.experienceLevel !== undefined && { experienceLevel: input.experienceLevel }),
          ...(input.visaSponsorship !== undefined && { visaSponsorship: input.visaSponsorship }),
          ...(input.keywords !== undefined && { keywords: input.keywords }),
          ...(input.searchTime !== undefined && { searchTime: input.searchTime }),
          ...(input.timezone !== undefined && { timezone: input.timezone }),
        },
      });
    }),

  // ────────────────────────────────────────────────────────
  // GMAIL STATUS (read-only — actions in gmail router)
  // ────────────────────────────────────────────────────────

  getGmailStatus: protectedProcedure.query(async ({ ctx }) => {
    const connection = await ctx.prisma.gmailConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { gmailEmail: true, lastScanAt: true, isActive: true },
    });

    return {
      connected: !!connection?.isActive,
      email: connection?.gmailEmail,
      lastScanAt: connection?.lastScanAt,
    };
  }),
});
