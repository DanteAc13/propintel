import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// GET /api/contractor/proposals - Get contractor's proposals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const proposals = await db.proposal.findMany({
      where: {
        contractor_id: userId,
        ...(status && { status: status as 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'OUTDATED' }),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            property: {
              select: {
                address_line1: true,
                city: true,
                state: true,
              },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    const proposalList = proposals.map((p) => ({
      id: p.id,
      status: p.status,
      total_amount: p.total_amount,
      submitted_at: p.submitted_at,
      expires_at: p.expires_at,
      project: p.project,
      itemCount: p._count.items,
    }))

    return NextResponse.json(proposalList)
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    )
  }
}

// POST /api/contractor/proposals - Create a new proposal
const createProposalSchema = z.object({
  project_id: z.string().uuid(),
  scope_snapshot_id: z.string().uuid(),
  contractor_id: z.string().uuid(),
  items: z.array(z.object({
    scope_item_id: z.string().uuid(),
    line_item_cost: z.number().min(0),
    notes: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
  estimated_start_date: z.string().optional(),
  estimated_duration_days: z.number().int().min(1).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createProposalSchema.parse(body)

    // Verify contractor is active
    const profile = await db.contractorProfile.findUnique({
      where: { user_id: data.contractor_id },
      select: { status: true },
    })

    if (!profile || profile.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Contractor account must be verified to submit proposals' },
        { status: 403 }
      )
    }

    // Verify project is in BIDDING status
    const project = await db.project.findUnique({
      where: { id: data.project_id },
      select: { status: true },
    })

    if (!project || project.status !== 'BIDDING') {
      return NextResponse.json(
        { error: 'Project is not open for bidding' },
        { status: 400 }
      )
    }

    // Check for existing proposal
    const existing = await db.proposal.findFirst({
      where: {
        project_id: data.project_id,
        contractor_id: data.contractor_id,
        scope_snapshot_id: data.scope_snapshot_id,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a proposal for this project', proposalId: existing.id },
        { status: 409 }
      )
    }

    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + item.line_item_cost, 0)

    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Create proposal with items in a transaction
    const proposal = await db.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({
        data: {
          project_id: data.project_id,
          scope_snapshot_id: data.scope_snapshot_id,
          contractor_id: data.contractor_id,
          total_amount: totalAmount,
          status: 'DRAFT',
          notes: data.notes,
          estimated_start_date: data.estimated_start_date
            ? new Date(data.estimated_start_date)
            : null,
          estimated_duration_days: data.estimated_duration_days,
          expires_at: expiresAt,
        },
      })

      // Create proposal items
      await tx.proposalItem.createMany({
        data: data.items.map((item) => ({
          proposal_id: proposal.id,
          scope_item_id: item.scope_item_id,
          line_item_cost: item.line_item_cost,
          notes: item.notes,
        })),
      })

      return proposal
    })

    return NextResponse.json(proposal, { status: 201 })
  } catch (error) {
    console.error('Error creating proposal:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    )
  }
}
