import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Create PostgreSQL connection pool
 */
function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

/**
 * Create Prisma client with pg adapter for Prisma 7.x
 */
function createPrismaClient() {
  const pool = globalForPrisma.pool ?? createPool();
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * Prisma client singleton to prevent multiple instances during development
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
