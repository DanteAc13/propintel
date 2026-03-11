import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/sections/[id] - Get section with observations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const { id } = await params

    const section = await db.section.findUnique({
      where: { id },
      include: {
        inspection: true,
        template: true,
        observations: {
          include: {
            media: true,
          },
          orderBy: { order_index: 'asc' },
        },
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Ownership check
    if (user.role === 'INSPECTOR' && section.inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // ADMIN passes through

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    )
  }
}

// PUT /api/sections/[id] - Update section
const updateSectionSchema = z.object({
  is_complete: z.boolean().optional(),
  is_not_applicable: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const { id } = await params

    // Fetch section with inspection for ownership check
    const existing = await db.section.findUnique({
      where: { id },
      include: { inspection: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Ownership check
    if (user.role === 'INSPECTOR' && existing.inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // ADMIN passes through

    const body = await request.json()
    const data = updateSectionSchema.parse(body)

    const section = await db.section.update({
      where: { id },
      data,
      include: {
        template: true,
        observations: {
          include: { media: true },
          orderBy: { order_index: 'asc' },
        },
      },
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error updating section:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    )
  }
}
