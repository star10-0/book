import { PrismaClient } from "@prisma/client";
import { validateServerEnvOnce } from "@/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

validateServerEnvOnce();

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
