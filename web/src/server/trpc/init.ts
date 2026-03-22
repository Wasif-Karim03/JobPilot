import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { logger } from "@/lib/logger";

// ============================================================
// CONTEXT
// ============================================================

export async function createTRPCContext(opts: { req: NextRequest }) {
  const session = await auth.api.getSession({ headers: opts.req.headers });

  return {
    prisma,
    session,
    req: opts.req,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ============================================================
// tRPC INITIALIZATION
// ============================================================

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ============================================================
// MIDDLEWARE
// ============================================================

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (result.ok) {
    logger.info("tRPC request", { path, type, duration });
  } else {
    logger.error("tRPC error", { path, type, duration, error: result.error.message });
  }

  return result;
});

// ============================================================
// PROCEDURE BUILDERS
// ============================================================

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Public — no auth required */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/** Protected — session required */
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

/** Onboarded — session + onboarding complete */
export const onboardedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { onboardingComplete: true },
  });

  if (!user?.onboardingComplete) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Complete onboarding before using this feature",
    });
  }

  return next({ ctx });
});

/** Admin — session + ADMIN role required */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return next({ ctx });
});
