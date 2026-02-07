import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/properties - Get properties for authenticated homeowner
export async function GET(request: NextRequest) {
  try {
    // TODO: Get authenticated user from session
    // For now, we'll use a query param for the owner_id
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('owner_id')

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID required' },
        { status: 400 }
      )
    }

    const properties = await db.property.findMany({
      where: { owner_id: ownerId },
      include: {
        inspections: {
          where: { status: 'APPROVED' },
          orderBy: { completed_at: 'desc' },
          take: 1,
          include: {
            _count: {
              select: { issues: true },
            },
          },
        },
        projects: {
          where: {
            status: {
              in: ['DRAFT', 'SCOPE_LOCKED', 'BIDDING', 'ACTIVE'],
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // Transform to include summary data
    const propertiesWithSummary = properties.map((property) => {
      const latestInspection = property.inspections[0]
      const activeProject = property.projects[0]

      return {
        ...property,
        issueCount: latestInspection?._count.issues ?? 0,
        lastInspectionDate: latestInspection?.completed_at,
        hasActiveProject: !!activeProject,
        projectStatus: activeProject?.status,
      }
    })

    return NextResponse.json(propertiesWithSummary)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}
