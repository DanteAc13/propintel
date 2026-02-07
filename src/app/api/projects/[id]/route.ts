import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id] - Get project with scope items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            address_line2: true,
            city: true,
            state: true,
            zip_code: true,
          },
        },
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        scope_items: {
          orderBy: [
            { is_suppressed: 'asc' },
            { order_index: 'asc' },
          ],
          include: {
            issue: {
              select: {
                id: true,
                normalized_title: true,
                normalized_description: true,
                homeowner_description: true,
                severity_label: true,
                severity_score: true,
                trade_category: true,
                master_format_code: true,
                urgency: true,
                is_safety_hazard: true,
                observation: {
                  include: {
                    media: {
                      take: 3,
                      orderBy: { created_at: 'desc' },
                    },
                  },
                },
              },
            },
          },
        },
        scope_snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        proposals: {
          where: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
          include: {
            contractor: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                contractor_profile: {
                  select: {
                    company_name: true,
                  },
                },
              },
            },
          },
          orderBy: { submitted_at: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update project
const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  intent_summary: z.string().optional().nullable(),
  intent_tags: z.array(z.string()).optional(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateProjectSchema.parse(body)

    // Check project exists and is editable
    const existing = await db.project.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Project can only be edited in DRAFT status' },
        { status: 400 }
      )
    }

    const project = await db.project.update({
      where: { id },
      data,
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            city: true,
            state: true,
          },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
