import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contractor/projects - Get available projects matching contractor's trades
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get contractor profile to find their trade categories
    const profile = await db.contractorProfile.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        trade_categories: true,
        master_format_codes: true,
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
      return NextResponse.json({
        projects: [],
        message: 'Your account must be verified to view available projects',
        status: profile.status,
      })
    }

    // Find projects in BIDDING status with scope items matching contractor's trades
    const projects = await db.project.findMany({
      where: {
        status: 'BIDDING',
      },
      include: {
        property: {
          select: {
            id: true,
            address_line1: true,
            city: true,
            state: true,
            zip_code: true,
          },
        },
        scope_items: {
          where: { is_suppressed: false },
          select: {
            id: true,
            trade_category: true,
            master_format_code: true,
          },
        },
        scope_snapshots: {
          where: { is_active: true },
          select: {
            id: true,
            version: true,
          },
          take: 1,
        },
        proposals: {
          where: { contractor_id: userId },
          select: { id: true, status: true },
        },
      },
      orderBy: { scope_locked_at: 'desc' },
    })

    // Filter projects that have scope items matching contractor's trades
    // and contractor hasn't already submitted a proposal
    const availableProjects = projects
      .filter((project) => {
        // Skip if contractor already has a non-draft proposal
        const existingProposal = project.proposals[0]
        if (existingProposal && existingProposal.status !== 'DRAFT') {
          return false
        }

        // Check if any scope items match contractor's trades
        const matchingItems = project.scope_items.filter((item) =>
          profile.trade_categories.includes(item.trade_category)
        )
        return matchingItems.length > 0
      })
      .map((project) => {
        const matchingItems = project.scope_items.filter((item) =>
          profile.trade_categories.includes(item.trade_category)
        )

        return {
          id: project.id,
          title: project.title,
          status: project.status,
          property: project.property,
          scope_locked_at: project.scope_locked_at,
          matchingItemsCount: matchingItems.length,
          totalItemsCount: project.scope_items.length,
          latestSnapshot: project.scope_snapshots[0] ?? null,
          hasExistingDraft: project.proposals.some((p) => p.status === 'DRAFT'),
        }
      })

    return NextResponse.json({
      projects: availableProjects,
      tradeCategories: profile.trade_categories,
    })
  } catch (error) {
    console.error('Error fetching contractor projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
