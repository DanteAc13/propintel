/**
 * Shared pagination utilities for API routes.
 */

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export function parsePagination(searchParams: URLSearchParams): {
  skip: number
  take: number
  page: number
  limit: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)
  const limit = Math.min(Math.max(1, rawLimit || DEFAULT_LIMIT), MAX_LIMIT)

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  }
}

export function paginationMeta(total: number, page: number, limit: number) {
  const safeLim = Math.max(1, limit)
  return {
    total,
    page,
    limit: safeLim,
    totalPages: Math.ceil(total / safeLim),
  }
}
