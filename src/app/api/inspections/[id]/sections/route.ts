import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/inspections/[id]/sections - Get all sections with observations
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params

    // Fetch the inspection to verify ownership
    const inspection = await db.inspection.findUnique({
      where: { id },
      include: { property: true },
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    // Role-based access check
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

    const sections = await db.section.findMany({
      where: { inspection_id: id },
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
    })

    return NextResponse.json(sections)
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}
