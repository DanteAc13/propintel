import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/inspections/[id]/start - Start inspection and create sections
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get the inspection
    const inspection = await db.inspection.findUnique({
      where: { id },
      include: { sections: true },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

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

    // Create sections if they don't exist
    if (inspection.sections.length === 0) {
      await db.section.createMany({
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
    const updatedInspection = await db.inspection.update({
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

    return NextResponse.json(updatedInspection)
  } catch (error) {
    console.error('Error starting inspection:', error)
    return NextResponse.json(
      { error: 'Failed to start inspection' },
      { status: 500 }
    )
  }
}
