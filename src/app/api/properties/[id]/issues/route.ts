import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/properties/[id]/issues - Get issues for a property grouped by urgency
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest()
    if (!auth.user) return auth.response

    const { id: propertyId } = await params

    // First, verify the property exists and get the latest approved inspection
    const property = await db.property.findUnique({
      where: { id: propertyId },
      include: {
        inspections: {
          where: { status: 'APPROVED' },
          orderBy: { completed_at: 'desc' },
          take: 1,
        },
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // HOMEOWNER: must own the property
    if (auth.user.role === 'HOMEOWNER' && property.owner_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this property' },
        { status: 403 }
      )
    }

    // INSPECTOR: must have an assigned inspection on this property
    if (auth.user.role === 'INSPECTOR') {
      const hasAccess = await db.inspection.findFirst({
        where: { property_id: propertyId, inspector_id: auth.user.id },
      })
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this property' },
          { status: 403 }
        )
      }
    }

    // CONTRACTOR: fetch profile and filter issues by matching trade_category
    let tradeCategoryFilter: { trade_category?: { in: string[] } } = {}
    if (auth.user.role === 'CONTRACTOR') {
      const profile = await db.contractorProfile.findUnique({
        where: { user_id: auth.user.id },
      })
      if (!profile) {
        return NextResponse.json(
          { error: 'Contractor profile not found' },
          { status: 403 }
        )
      }
      if (profile.trade_categories.length > 0) {
        tradeCategoryFilter = { trade_category: { in: profile.trade_categories } }
      }
    }

    // ADMIN: pass (no filter)

    const latestInspection = property.inspections[0]

    if (!latestInspection) {
      return NextResponse.json({
        issues: [],
        grouped: {
          safety: [],
          major: [],
          minor: [],
          cosmetic: [],
        },
        message: 'No approved inspection found for this property',
      })
    }

    // Get all issues for this property from the latest approved inspection
    const issues = await db.issue.findMany({
      where: {
        property_id: propertyId,
        inspection_id: latestInspection.id,
        ...tradeCategoryFilter,
      },
      include: {
        observation: {
          include: {
            media: {
              take: 3, // Limit photos for performance
              orderBy: { created_at: 'desc' },
            },
            section: {
              include: {
                template: {
                  select: { name: true, icon: true },
                },
              },
            },
          },
        },
        scope_items: {
          where: { is_suppressed: false },
          select: {
            id: true,
            project_id: true,
            is_suppressed: true,
          },
        },
      },
      orderBy: [
        { severity_score: 'desc' },
        { urgency: 'asc' },
        { created_at: 'asc' },
      ],
    })

    // Group issues by severity for homeowner view
    const grouped = {
      safety: issues.filter((i) => i.is_safety_hazard || i.severity_label === 'CRITICAL'),
      major: issues.filter((i) => !i.is_safety_hazard && i.severity_label === 'HIGH'),
      minor: issues.filter((i) => i.severity_label === 'MEDIUM'),
      cosmetic: issues.filter((i) => i.severity_label === 'LOW'),
    }

    // Get active project for this property (if exists)
    const activeProject = await db.project.findFirst({
      where: {
        property_id: propertyId,
        status: { in: ['DRAFT', 'SCOPE_LOCKED', 'BIDDING'] },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({
      issues,
      grouped,
      activeProject: activeProject ? {
        id: activeProject.id,
        status: activeProject.status,
        title: activeProject.title,
      } : null,
      inspectionId: latestInspection.id,
      inspectionDate: latestInspection.completed_at,
    })
  } catch (error) {
    console.error('Error fetching property issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property issues' },
      { status: 500 }
    )
  }
}
