import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/inspections/[id]/sections - Get all sections with observations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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
