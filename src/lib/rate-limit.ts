/**
 * In-memory sliding window rate limiter.
 * Suitable for single-server deployment. For multi-server, swap to Redis.
 */

interface RateLimitEntry {
  timestamps: number[]
  windowMs: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leak — runs at most once per minute
let lastCleanup = 0
const CLEANUP_INTERVAL_MS = 60_000

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of store) {
    const cutoff = now - entry.windowMs
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - config.windowMs

  cleanup()

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [], windowMs: config.windowMs }
    store.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= config.limit) {
    const oldestInWindow = entry.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + config.windowMs - now,
    }
  }

  entry.timestamps.push(now)

  return {
    allowed: true,
    remaining: config.limit - entry.timestamps.length,
    resetMs: config.windowMs,
  }
}

// Preset configurations for common endpoints
export const RATE_LIMITS = {
  /** Login/signup: 10 attempts per 15 minutes per IP */
  auth: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Media upload: 30 uploads per 5 minutes per user */
  upload: { limit: 30, windowMs: 5 * 60 * 1000 },
  /** AI endpoints: 20 requests per minute per user */
  ai: { limit: 20, windowMs: 60 * 1000 },
} as const
