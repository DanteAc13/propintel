import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/proposals - Get all proposals for a project (homeowner view)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params

    // Get project to verify it exists
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        owner_id: true,
        property: {
          select: {
            address_line1: true,
            city: true,
            state: true,
          },
        },
        scope_items: {
          where: { is_suppressed: false },
          select: {
            id: true,
            title: true,
            description: true,
            trade_category: true,
            issue: {
              select: {
                homeowner_description: true,
                severity_label: true,
              },
            },
          },
          orderBy: { order_index: 'asc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get all submitted proposals
    const proposals = await db.proposal.findMany({
      where: {
        project_id: projectId,
        status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'] },
      },
      include: {
        contractor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            contractor_profile: {
              select: {
                company_name: true,
                years_experience: true,
                trade_categories: true,
              },
            },
          },
        },
        items: {
          include: {
            scope_item: {
              select: {
                id: true,
                title: true,
                trade_category: true,
                issue: {
                  select: {
                    homeowner_description: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACCEPTED first, then SUBMITTED, then REJECTED
        { total_amount: 'asc' },
      ],
    })

    // Transform for homeowner view (plain English, no technical codes)
    const proposalsForHomeowner = proposals.map((p) => ({
      id: p.id,
      status: p.status,
      totalAmount: Number(p.total_amount),
      notes: p.notes,
      estimatedStartDate: p.estimated_start_date,
      estimatedDurationDays: p.estimated_duration_days,
      submittedAt: p.submitted_at,
      expiresAt: p.expires_at,
      contractor: {
        id: p.contractor.id,
        name: `${p.contractor.first_name} ${p.contractor.last_name}`,
        companyName: p.contractor.contractor_profile?.company_name ?? 'Independent',
        yearsExperience: p.contractor.contractor_profile?.years_experience,
        trades: p.contractor.contractor_profile?.trade_categories ?? [],
      },
      items: p.items.map((item) => ({
        id: item.id,
        scopeItemId: item.scope_item_id,
        title: item.scope_item.issue?.homeowner_description ?? item.scope_item.title,
        tradeCategory: item.scope_item.trade_category,
        cost: Number(item.line_item_cost),
        notes: item.notes,
      })),
    }))

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        property: project.property,
        scopeItemCount: project.scope_items.length,
      },
      proposals: proposalsForHomeowner,
      hasAcceptedProposal: proposals.some((p) => p.status === 'ACCEPTED'),
    })
  } catch (error) {
    console.error('Error fetching project proposals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    )
  }
}
