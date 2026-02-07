import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/inspections/[id]/complete - Complete inspection (submit for review)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get the inspection with sections
    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            observations: true,
          },
        },
      },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    if (inspection.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Inspection is not in progress' },
        { status: 400 }
      )
    }

    // Check that all sections are either complete or marked N/A
    const incompleteSections = inspection.sections.filter(
      (section) => !section.is_complete && !section.is_not_applicable
    )

    if (incompleteSections.length > 0) {
      return NextResponse.json(
        {
          error: 'All sections must be completed or marked N/A',
          incompleteSections: incompleteSections.length,
        },
        { status: 400 }
      )
    }

    // Update inspection status
    const updatedInspection = await db.inspection.update({
      where: { id },
      data: {
        status: 'IN_REVIEW',
        completed_at: new Date(),
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

    return NextResponse.json(updatedInspection)
  } catch (error) {
    console.error('Error completing inspection:', error)
    return NextResponse.json(
      { error: 'Failed to complete inspection' },
      { status: 500 }
    )
  }
}
