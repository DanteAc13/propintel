import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inspections - Get inspections (filtered by query params)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inspectorId = searchParams.get('inspector_id')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (inspectorId) {
      where.inspector_id = inspectorId
    }

    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(',')
      where.status = { in: statuses }
    }

    const inspections = await db.inspection.findMany({
      where,
      include: {
        property: true,
        inspector: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        sections: {
          include: {
            observations: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { scheduled_date: 'asc' },
      ],
    })

    return NextResponse.json(inspections)
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    )
  }
}
