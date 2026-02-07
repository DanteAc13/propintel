import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/contractors - Get contractors for verification queue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', or 'all'
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const statusFilter = status && status !== 'all'
      ? { status: status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' }
      : {}

    const [contractors, total] = await Promise.all([
      db.contractorProfile.findMany({
        where: statusFilter,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              avatar_url: true,
              created_at: true,
            },
          },
          verified_by: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // PENDING first
          { created_at: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.contractorProfile.count({ where: statusFilter }),
    ])

    return NextResponse.json({
      contractors,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching contractors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractors' },
      { status: 500 }
    )
  }
}
