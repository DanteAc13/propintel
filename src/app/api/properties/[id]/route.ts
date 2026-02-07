import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/properties/[id] - Get property details with latest approved inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const property = await db.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        inspections: {
          where: { status: 'APPROVED' },
          orderBy: { completed_at: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            completed_at: true,
            approved_at: true,
          },
        },
        projects: {
          orderBy: { created_at: 'desc' },
          include: {
            _count: {
              select: {
                scope_items: {
                  where: { is_suppressed: false },
                },
              },
            },
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}
