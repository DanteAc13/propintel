import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

import type { Prisma } from '@prisma/client'

const unmatchedWhere: Prisma.ObservationWhereInput = {
  status: { in: ['DEFICIENT', 'MAINTENANCE_NEEDED'] },
  issues: { none: {} },
}

// GET /api/admin/unmatched-observations — Observations with status DEFICIENT/MAINTENANCE_NEEDED that have no issue
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count_only') === 'true'

    // Fast path: dashboard only needs the count
    if (countOnly) {
      const count = await db.observation.count({ where: unmatchedWhere })
      return NextResponse.json({ count })
    }

    // Full query with includes for the detail page
    const unmatched = await db.observation.findMany({
      where: unmatchedWhere,
      include: {
        section: {
          select: {
            inspection_id: true,
            template: { select: { id: true, name: true } },
            inspection: {
              select: {
                id: true,
                status: true,
                property_id: true,
                property: {
                  select: {
                    address_line1: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
        },
        media: { take: 3, orderBy: { created_at: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      count: unmatched.length,
      observations: unmatched,
    })
  } catch (error) {
    console.error('Error fetching unmatched observations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unmatched observations' },
      { status: 500 }
    )
  }
}
