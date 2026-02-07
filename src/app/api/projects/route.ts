import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// GET /api/projects - Get projects for authenticated homeowner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('owner_id')
    const propertyId = searchParams.get('property_id')

    if (!ownerId && !propertyId) {
      return NextResponse.json(
        { error: 'Owner ID or Property ID required' },
        { status: 400 }
      )
    }

    const projects = await db.project.findMany({
      where: {
        ...(ownerId && { owner_id: ownerId }),
        ...(propertyId && { property_id: propertyId }),
      },
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            city: true,
            state: true,
          },
        },
        scope_items: {
          where: { is_suppressed: false },
          include: {
            issue: {
              select: {
                id: true,
                normalized_title: true,
                homeowner_description: true,
                severity_label: true,
                trade_category: true,
              },
            },
          },
        },
        _count: {
          select: {
            proposals: true,
            scope_items: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project for a property
const createProjectSchema = z.object({
  property_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  title: z.string().min(1),
  intent_summary: z.string().optional(),
  intent_tags: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createProjectSchema.parse(body)

    // Verify property exists and belongs to owner
    const property = await db.property.findFirst({
      where: {
        id: data.property_id,
        owner_id: data.owner_id,
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found or not owned by user' },
        { status: 404 }
      )
    }

    // Check if there's already an active project
    const existingProject = await db.project.findFirst({
      where: {
        property_id: data.property_id,
        status: { in: ['DRAFT', 'SCOPE_LOCKED', 'BIDDING', 'ACTIVE'] },
      },
    })

    if (existingProject) {
      return NextResponse.json(
        { error: 'An active project already exists for this property', existingProjectId: existingProject.id },
        { status: 409 }
      )
    }

    const project = await db.project.create({
      data: {
        property_id: data.property_id,
        owner_id: data.owner_id,
        title: data.title,
        intent_summary: data.intent_summary,
        intent_tags: data.intent_tags ?? [],
        status: 'DRAFT',
      },
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

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
