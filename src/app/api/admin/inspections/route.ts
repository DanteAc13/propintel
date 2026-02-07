import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/inspections - Get inspections for admin queues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queue = searchParams.get('queue') // 'assignment', 'review', or 'all'
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    // Build filter based on queue type
    let statusFilter: object = {}
    if (queue === 'assignment') {
      statusFilter = { status: 'SCHEDULED', inspector_id: null }
    } else if (queue === 'review') {
      statusFilter = { status: 'IN_REVIEW' }
    } else if (status) {
      statusFilter = { status }
    }

    const [inspections, total] = await Promise.all([
      db.inspection.findMany({
        where: statusFilter,
        include: {
          property: {
            select: {
              id: true,
              address_line1: true,
              city: true,
              state: true,
              zip_code: true,
              owner: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          inspector: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          _count: {
            select: {
              sections: true,
              issues: true,
            },
          },
        },
        orderBy: [
          { scheduled_date: 'asc' },
          { created_at: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.inspection.count({ where: statusFilter }),
    ])

    // Get available inspectors for assignment queue
    let availableInspectors: Array<{
      id: string
      first_name: string
      last_name: string
      email: string
      active_inspections: number
    }> = []

    if (queue === 'assignment') {
      const inspectors = await db.user.findMany({
        where: {
          role: 'INSPECTOR',
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          _count: {
            select: {
              assigned_inspections: {
                where: {
                  status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                },
              },
            },
          },
        },
        orderBy: { first_name: 'asc' },
      })

      availableInspectors = inspectors.map((i) => ({
        id: i.id,
        first_name: i.first_name,
        last_name: i.last_name,
        email: i.email,
        active_inspections: i._count.assigned_inspections,
      }))
    }

    return NextResponse.json({
      inspections,
      total,
      limit,
      offset,
      ...(queue === 'assignment' && { availableInspectors }),
    })
  } catch (error) {
    console.error('Error fetching admin inspections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    )
  }
}
