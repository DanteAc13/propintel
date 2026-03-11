import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/contractor/projects - Get available projects matching contractor's trades
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    // Get contractor profile to find their trade categories
    const profile = await db.contractorProfile.findUnique({
      where: { user_id: user.id },
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
    // Post-query filtering by trade match makes DB-level pagination impractical,
    // but we cap at 200 to prevent unbounded memory usage at scale.
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
          where: { contractor_id: user.id },
          select: { id: true, status: true },
        },
      },
      orderBy: { scope_locked_at: 'desc' },
      take: 200,
    })

    // Filter + transform in a single pass
    const availableProjects: Array<{
      id: string
      title: string
      status: string
      property: typeof projects[0]['property']
      scope_locked_at: Date | null
      matchingItemsCount: number
      totalItemsCount: number
      latestSnapshot: { id: string; version: number } | null
      hasExistingDraft: boolean
    }> = []

    for (const project of projects) {
      const existingProposal = project.proposals[0]
      if (existingProposal && existingProposal.status !== 'DRAFT') continue

      const matchingItems = project.scope_items.filter((item) =>
        profile.trade_categories.includes(item.trade_category)
      )
      if (matchingItems.length === 0) continue

      availableProjects.push({
        id: project.id,
        title: project.title,
        status: project.status,
        property: project.property,
        scope_locked_at: project.scope_locked_at,
        matchingItemsCount: matchingItems.length,
        totalItemsCount: project.scope_items.length,
        latestSnapshot: project.scope_snapshots[0] ?? null,
        hasExistingDraft: project.proposals.some((p) => p.status === 'DRAFT'),
      })
    }

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
