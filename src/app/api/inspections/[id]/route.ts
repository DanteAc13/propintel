import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/inspections/[id] - Get inspection with property and sections
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest()
    if (!auth.user) return auth.response
    const { user } = auth

    const { id } = await params

    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        property: true,
        inspector: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        sections: {
          include: {
            template: true,
            observations: {
              include: {
                media: true,
              },
              orderBy: { order_index: 'asc' },
            },
          },
          orderBy: { order_index: 'asc' },
        },
      },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    // Role-based access check
    if (user.role === 'CONTRACTOR') {
      return NextResponse.json(
        { error: 'Contractors cannot access inspections' },
        { status: 403 }
      )
    }
    if (user.role === 'HOMEOWNER' && inspection.property.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    if (user.role === 'INSPECTOR' && inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // ADMIN passes through

    return NextResponse.json(inspection)
  } catch (error) {
    console.error('Error fetching inspection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    )
  }
}

// PUT /api/inspections/[id] - Update inspection
const updateInspectionSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  notes: z.string().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const { id } = await params

    // Fetch inspection first for ownership check
    const existing = await db.inspection.findUnique({
      where: { id },
      include: { property: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (user.role === 'INSPECTOR' && existing.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // ADMIN passes through

    const body = await request.json()
    const data = updateInspectionSchema.parse(body)

    const inspection = await db.inspection.update({
      where: { id },
      data: {
        ...data,
        started_at: data.started_at ? new Date(data.started_at) : undefined,
        completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      },
      include: {
        property: true,
        sections: {
          include: {
            template: true,
            observations: true,
          },
          orderBy: { order_index: 'asc' },
        },
      },
    })

    return NextResponse.json(inspection)
  } catch (error) {
    console.error('Error updating inspection:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update inspection' },
      { status: 500 }
    )
  }
}
