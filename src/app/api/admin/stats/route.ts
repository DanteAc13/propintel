import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/stats - Get admin dashboard overview statistics
export async function GET() {
  try {
    // TODO: Verify admin role from authenticated user

    // Run all stat queries in parallel
    const [
      pendingInspections,
      inProgressInspections,
      reviewQueue,
      pendingContractors,
      activeContractors,
      totalUsers,
      activeProjects,
      recentIssues,
    ] = await Promise.all([
      // Inspections needing assignment (scheduled but no inspector)
      db.inspection.count({
        where: {
          status: 'SCHEDULED',
          inspector_id: null,
        },
      }),

      // Inspections currently in progress
      db.inspection.count({
        where: { status: 'IN_PROGRESS' },
      }),

      // Inspections needing review
      db.inspection.count({
        where: { status: 'IN_REVIEW' },
      }),

      // Contractors pending verification
      db.contractorProfile.count({
        where: { status: 'PENDING' },
      }),

      // Active contractors
      db.contractorProfile.count({
        where: { status: 'ACTIVE' },
      }),

      // Total users by role
      db.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { is_active: true },
      }),

      // Active projects (DRAFT, BIDDING, ACTIVE)
      db.project.count({
        where: {
          status: { in: ['DRAFT', 'SCOPE_LOCKED', 'BIDDING', 'ACTIVE'] },
        },
      }),

      // Issues generated in last 30 days
      db.issue.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Format user counts by role
    const usersByRole = totalUsers.reduce(
      (acc, item) => {
        acc[item.role.toLowerCase()] = item._count.id
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      inspections: {
        pendingAssignment: pendingInspections,
        inProgress: inProgressInspections,
        needsReview: reviewQueue,
      },
      contractors: {
        pendingVerification: pendingContractors,
        active: activeContractors,
      },
      users: {
        total: Object.values(usersByRole).reduce((a, b) => a + b, 0),
        byRole: usersByRole,
      },
      projects: {
        active: activeProjects,
      },
      activity: {
        issuesLast30Days: recentIssues,
      },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
