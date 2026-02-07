// src/lib/db.ts
// Prisma Client singleton using driver adapter pattern for Prisma 7 + Supabase
//
// This file is the source of truth for all database queries.
// Never use raw SQL in application code - use Prisma.

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Create a typed global to cache the Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Use DIRECT_URL for Prisma connections (session pooler, port 5432)
// This is required for Prisma with Supabase's Supavisor pooler
const connectionString = process.env.DIRECT_URL!

// Create or reuse pool
const pool = globalForPrisma.pool ?? new Pool({ connectionString })

// Create adapter
const adapter = new PrismaPg(pool)

// Create or reuse Prisma client
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Cache in global in development to prevent hot reload issues
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.pool = pool
}
