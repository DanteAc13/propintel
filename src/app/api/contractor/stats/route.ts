import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/contractor/stats - Get contractor dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    // Get contractor profile
    const profile = await db.contractorProfile.findUnique({
      where: { user_id: user.id },
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
        where: { contractor_id: user.id, status: 'DRAFT' },
      }),
      db.proposal.count({
        where: { contractor_id: user.id, status: 'SUBMITTED' },
      }),
      db.proposal.count({
        where: { contractor_id: user.id, status: 'ACCEPTED' },
      }),
      db.proposal.count({
        where: { contractor_id: user.id },
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
              contractor_id: user.id,
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
