import { PrismaClient } from "@prisma/client";

// =============================================================================
// Global type augmentation — prevents TypeScript errors on globalThis.__prisma
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// =============================================================================
// Log configuration — verbose in development, errors only in production
// =============================================================================

const log: ("query" | "info" | "warn" | "error")[] =
  process.env.NODE_ENV === "development"
    ? ["query", "error"]
    : ["error"];

// =============================================================================
// Singleton PrismaClient
//
// In development, Next.js hot-reloads modules on every file change, which
// would instantiate a new PrismaClient on each reload and exhaust the
// connection pool. Caching the instance on globalThis survives hot reloads.
//
// In production, module scope is stable per process — a new instance is safe.
// =============================================================================

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log });

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}