import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/users - Get users for admin management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'HOMEOWNER', 'INSPECTOR', 'CONTRACTOR', 'ADMIN', or null for all
    const search = searchParams.get('search') // Search by name or email
    const isActive = searchParams.get('is_active') // 'true', 'false', or null for all
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const where: object = {
      ...(role && { role: role as 'HOMEOWNER' | 'INSPECTOR' | 'CONTRACTOR' | 'ADMIN' }),
      ...(isActive !== null && { is_active: isActive === 'true' }),
      ...(search && {
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          avatar_url: true,
          is_active: true,
          email_verified: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              owned_properties: true,
              assigned_inspections: true,
              owned_projects: true,
              proposals: true,
            },
          },
          contractor_profile: {
            select: {
              id: true,
              company_name: true,
              status: true,
              trade_categories: true,
            },
          },
        },
        orderBy: [
          { created_at: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.user.count({ where }),
    ])

    // Transform to add summary stats
    const usersWithStats = users.map((user) => ({
      ...user,
      stats: {
        properties: user._count.owned_properties,
        inspections: user._count.assigned_inspections,
        projects: user._count.owned_projects,
        proposals: user._count.proposals,
      },
      _count: undefined, // Remove raw count
    }))

    return NextResponse.json({
      users: usersWithStats,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
