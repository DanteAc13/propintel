import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contractor/stats - Get contractor dashboard statistics
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

    // Get proposal counts
    const [
      draftCount,
      submittedCount,
      acceptedCount,
      totalProposals,
    ] = await Promise.all([
      db.proposal.count({
        where: { contractor_id: userId, status: 'DRAFT' },
      }),
      db.proposal.count({
        where: { contractor_id: userId, status: 'SUBMITTED' },
      }),
      db.proposal.count({
        where: { contractor_id: userId, status: 'ACCEPTED' },
      }),
      db.proposal.count({
        where: { contractor_id: userId },
      }),
    ])

    // Count available projects (if contractor is active)
    let availableProjects = 0
    if (profile.status === 'ACTIVE') {
      // Get projects in BIDDING with matching scope items
      const projects = await db.project.findMany({
        where: { status: 'BIDDING' },
        include: {
          scope_items: {
            where: {
              is_suppressed: false,
              trade_category: { in: profile.trade_categories },
            },
            select: { id: true },
          },
          proposals: {
            where: {
              contractor_id: userId,
              status: { not: 'DRAFT' },
            },
            select: { id: true },
          },
        },
      })

      // Count projects with matching items and no submitted proposal
      availableProjects = projects.filter(
        (p) => p.scope_items.length > 0 && p.proposals.length === 0
      ).length
    }

    return NextResponse.json({
      availableProjects,
      activeBids: submittedCount,
      wonProjects: acceptedCount,
      draftProposals: draftCount,
      totalProposals,
      accountStatus: profile.status,
    })
  } catch (error) {
    console.error('Error fetching contractor stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
