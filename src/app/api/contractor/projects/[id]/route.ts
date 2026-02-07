import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/contractor/projects/[id] - Get project detail with scope items filtered by contractor's trades
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get contractor profile
    const profile = await db.contractorProfile.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        trade_categories: true,
        status: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      )
    }

    if (profile.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your account must be verified to view project details' },
        { status: 403 }
      )
    }

    // Get project with scope items
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            address_line2: true,
            city: true,
            state: true,
            zip_code: true,
            year_built: true,
            square_footage: true,
          },
        },
        scope_items: {
          where: {
            is_suppressed: false,
            trade_category: { in: profile.trade_categories },
          },
          include: {
            issue: {
              select: {
                id: true,
                normalized_title: true,
                normalized_description: true,
                master_format_code: true,
                trade_category: true,
                severity_label: true,
                severity_score: true,
                urgency: true,
                is_safety_hazard: true,
                observation: {
                  select: {
                    id: true,
                    component: true,
                    description_raw: true,
                    location_detail: true,
                    inspector_notes: true,
                    media: {
                      orderBy: { created_at: 'asc' },
                    },
                  },
                },
              },
            },
          },
          orderBy: { order_index: 'asc' },
        },
        scope_snapshots: {
          where: { is_active: true },
          select: {
            id: true,
            version: true,
            locked_at: true,
          },
          take: 1,
        },
        proposals: {
          where: { contractor_id: userId },
          select: {
            id: true,
            status: true,
            total_amount: true,
          },
          take: 1,
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'BIDDING') {
      return NextResponse.json(
        { error: 'Project is not open for bidding' },
        { status: 400 }
      )
    }

    if (project.scope_items.length === 0) {
      return NextResponse.json(
        { error: 'No scope items match your trade categories' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      status: project.status,
      property: project.property,
      scope_locked_at: project.scope_locked_at,
      latestSnapshot: project.scope_snapshots[0] ?? null,
      matchingScopeItems: project.scope_items,
      existingProposal: project.proposals[0] ?? null,
      contractorTrades: profile.trade_categories,
    })
  } catch (error) {
    console.error('Error fetching project for contractor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}
