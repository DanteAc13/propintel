import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/admin/inspections/[id] - Get inspection details for admin review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        property: {
          include: {
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
            phone: true,
          },
        },
        approved_by: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
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
        issues: {
          orderBy: [
            { severity_score: 'desc' },
            { created_at: 'asc' },
          ],
        },
      },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(inspection)
  } catch (error) {
    console.error('Error fetching inspection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/inspections/[id] - Assign inspector, approve, or reject inspection
const updateInspectionSchema = z.object({
  action: z.enum(['assign', 'approve', 'reject']),
  inspector_id: z.string().uuid().optional(),
  admin_id: z.string().uuid().optional(), // For approval tracking
  rejection_notes: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateInspectionSchema.parse(body)

    const inspection = await db.inspection.findUnique({
      where: { id },
      select: { status: true, inspector_id: true },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    let updateData: object = {}

    switch (data.action) {
      case 'assign':
        if (!data.inspector_id) {
          return NextResponse.json(
            { error: 'Inspector ID required for assignment' },
            { status: 400 }
          )
        }
        if (inspection.status !== 'SCHEDULED') {
          return NextResponse.json(
            { error: 'Can only assign inspector to SCHEDULED inspections' },
            { status: 400 }
          )
        }

        // Verify inspector exists and has correct role
        const inspector = await db.user.findFirst({
          where: { id: data.inspector_id, role: 'INSPECTOR', is_active: true },
        })
        if (!inspector) {
          return NextResponse.json(
            { error: 'Invalid inspector' },
            { status: 400 }
          )
        }

        updateData = { inspector_id: data.inspector_id }
        break

      case 'approve':
        if (inspection.status !== 'IN_REVIEW') {
          return NextResponse.json(
            { error: 'Can only approve inspections in IN_REVIEW status' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'APPROVED',
          approved_at: new Date(),
          approved_by_id: data.admin_id,
        }
        break

      case 'reject':
        if (inspection.status !== 'IN_REVIEW') {
          return NextResponse.json(
            { error: 'Can only reject inspections in IN_REVIEW status' },
            { status: 400 }
          )
        }
        if (!data.rejection_notes) {
          return NextResponse.json(
            { error: 'Rejection notes required' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'REJECTED',
          rejection_notes: data.rejection_notes,
        }
        break
    }

    const updated = await db.inspection.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            city: true,
            state: true,
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
      },
    })

    return NextResponse.json({
      message: `Inspection ${data.action}${data.action === 'assign' ? 'ed' : data.action === 'approve' ? 'd' : 'ed'} successfully`,
      inspection: updated,
    })
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
