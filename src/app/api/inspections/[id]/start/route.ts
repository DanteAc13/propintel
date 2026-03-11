import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/inspections/[id]/start - Start inspection and create sections
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const { id } = await params

    // Get the inspection (select only fields needed for auth + status check)
    const inspection = await db.inspection.findUnique({
      where: { id },
      select: { id: true, inspector_id: true, status: true },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    // Ownership check
    if (user.role === 'INSPECTOR' && inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // ADMIN passes through

    if (inspection.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Inspection is not in SCHEDULED status' },
        { status: 400 }
      )
    }

    // Get all active section templates
    const templates = await db.sectionTemplate.findMany({
      where: { is_active: true },
      orderBy: { order_index: 'asc' },
    })

    // Create sections + update status in a single transaction
    const updatedInspection = await db.$transaction(async (tx) => {
      // Re-check status inside transaction to prevent TOCTOU race
      const fresh = await tx.inspection.findUnique({
        where: { id },
        select: { status: true, sections: { select: { id: true } } },
      })

      if (!fresh || fresh.status !== 'SCHEDULED') {
        throw new Error('CONFLICT: Inspection is no longer in SCHEDULED status')
      }

      // Create sections if they don't exist
      if (fresh.sections.length === 0) {
        await tx.section.createMany({
          data: templates.map((template) => ({
            inspection_id: id,
            template_id: template.id,
            order_index: template.order_index,
            is_complete: false,
            is_not_applicable: false,
          })),
        })
      }

      // Update inspection status
      return tx.inspection.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          started_at: new Date(),
        },
        include: {
          property: true,
          sections: {
            include: {
              template: true,
              observations: {
                include: { media: true },
                orderBy: { order_index: 'asc' },
              },
            },
            orderBy: { order_index: 'asc' },
          },
        },
      })
    })

    return NextResponse.json(updatedInspection)
  } catch (error) {
    console.error('Error starting inspection:', error)
    if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
      return NextResponse.json(
        { error: error.message.replace('CONFLICT: ', '') },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to start inspection' },
      { status: 500 }
    )
  }
}
