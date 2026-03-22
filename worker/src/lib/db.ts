import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

let prismaInstance: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [{ emit: "event", level: "error" }],
    });

    prismaInstance.$on("error" as never, (e: { message: string }) => {
      logger.error("Prisma error", { error: e.message });
    });
  }
  return prismaInstance;
}

export async function closeDb(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
