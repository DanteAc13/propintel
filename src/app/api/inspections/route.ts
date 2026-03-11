import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { parsePagination, paginationMeta } from '@/lib/pagination'

// GET /api/inspections - Get inspections (scoped by role)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (!auth.user) return auth.response
    const { user } = auth

    // Contractors cannot access inspections
    if (user.role === 'CONTRACTOR') {
      return NextResponse.json(
        { error: 'Contractors cannot access inspections' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    // Role-based scoping — never trust client-supplied IDs
    if (user.role === 'HOMEOWNER') {
      where.property = { owner_id: user.id }
    } else if (user.role === 'INSPECTOR') {
      where.inspector_id = user.id
    }
    // ADMIN: no filter

    if (status) {
      // Support comma-separated statuses
      const statuses = status.split(',')
      where.status = { in: statuses }
    }

    const { skip, take, page, limit } = parsePagination(searchParams)

    const [inspections, total] = await Promise.all([
      db.inspection.findMany({
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
          _count: { select: { sections: true } },
        },
        orderBy: [
          { status: 'asc' },
          { scheduled_date: 'asc' },
        ],
        skip,
        take,
      }),
      db.inspection.count({ where }),
    ])

    return NextResponse.json({
      data: inspections,
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    )
  }
}

// POST /api/inspections - Schedule a new inspection (ADMIN only)
const createInspectionSchema = z.object({
  property_id: z.string().uuid(),
  scheduled_date: z.string().min(1),
  inspector_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = createInspectionSchema.parse(body)

    // Verify property exists
    const property = await db.property.findUnique({
      where: { id: data.property_id },
      select: { id: true, address_line1: true },
    })
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check for existing active inspection on this property
    const activeInspection = await db.inspection.findFirst({
      where: {
        property_id: data.property_id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'IN_REVIEW'] },
      },
    })
    if (activeInspection) {
      return NextResponse.json(
        { error: 'An active inspection already exists for this property', inspectionId: activeInspection.id },
        { status: 409 }
      )
    }

    // Verify inspector if provided
    if (data.inspector_id) {
      const inspector = await db.user.findUnique({
        where: { id: data.inspector_id, role: 'INSPECTOR', is_active: true },
        select: { id: true },
      })
      if (!inspector) {
        return NextResponse.json(
          { error: 'Inspector not found or inactive' },
          { status: 404 }
        )
      }
    }

    // Validate scheduled_date is not in the past
    const scheduledDate = new Date(data.scheduled_date)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled date' },
        { status: 400 }
      )
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (scheduledDate < today) {
      return NextResponse.json(
        { error: 'Scheduled date cannot be in the past' },
        { status: 400 }
      )
    }

    const inspection = await db.inspection.create({
      data: {
        property_id: data.property_id,
        inspector_id: data.inspector_id ?? null,
        status: 'SCHEDULED',
        scheduled_date: scheduledDate,
        notes: data.notes ?? null,
      },
      include: {
        property: true,
        inspector: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    })

    return NextResponse.json(inspection, { status: 201 })
  } catch (error) {
    console.error('Error creating inspection:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create inspection' },
      { status: 500 }
    )
  }
}
