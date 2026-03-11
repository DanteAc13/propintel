import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { parsePagination, paginationMeta } from '@/lib/pagination'

// GET /api/contractor/proposals - Get contractor's proposals
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = {
      contractor_id: user.id,
      ...(status && { status: status as 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'OUTDATED' }),
    }

    const { skip, take, page, limit } = parsePagination(searchParams)

    const [proposals, total] = await Promise.all([
      db.proposal.findMany({
        where,
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
        skip,
        take,
      }),
      db.proposal.count({ where }),
    ])

    const proposalList = proposals.map((p) => ({
      id: p.id,
      status: p.status,
      total_amount: p.total_amount,
      submitted_at: p.submitted_at,
      expires_at: p.expires_at,
      project: p.project,
      itemCount: p._count.items,
    }))

    return NextResponse.json({
      data: proposalList,
      pagination: paginationMeta(total, page, limit),
    })
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
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const body = await request.json()
    const data = createProposalSchema.parse(body)

    // Validate contractor, project, and duplicate check in parallel
    const [profile, project, existing] = await Promise.all([
      db.contractorProfile.findUnique({
        where: { user_id: user.id },
        select: { status: true },
      }),
      db.project.findUnique({
        where: { id: data.project_id },
        select: { status: true },
      }),
      db.proposal.findFirst({
        where: {
          project_id: data.project_id,
          contractor_id: user.id,
          scope_snapshot_id: data.scope_snapshot_id,
        },
      }),
    ])

    if (!profile || profile.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Contractor account must be verified to submit proposals' },
        { status: 403 }
      )
    }

    if (!project || project.status !== 'BIDDING') {
      return NextResponse.json(
        { error: 'Project is not open for bidding' },
        { status: 400 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a proposal for this project', proposalId: existing.id },
        { status: 409 }
      )
    }

    // Verify scope_snapshot belongs to this project
    const snapshot = await db.scopeSnapshot.findUnique({
      where: { id: data.scope_snapshot_id },
      select: { project_id: true, is_active: true },
    })

    if (!snapshot || snapshot.project_id !== data.project_id) {
      return NextResponse.json(
        { error: 'Invalid scope snapshot for this project' },
        { status: 400 }
      )
    }

    if (!snapshot.is_active) {
      return NextResponse.json(
        { error: 'Scope snapshot is no longer active' },
        { status: 400 }
      )
    }

    // Verify all scope_item_ids belong to this project
    const scopeItemIds = data.items.map(i => i.scope_item_id)
    const validScopeItems = await db.scopeItem.findMany({
      where: { id: { in: scopeItemIds }, project_id: data.project_id, is_suppressed: false },
      select: { id: true },
    })
    const validIds = new Set(validScopeItems.map(s => s.id))
    const invalidIds = scopeItemIds.filter(id => !validIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'One or more scope items do not belong to this project' },
        { status: 400 }
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
          contractor_id: user.id,
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
    // Catch unique constraint violation (race: duplicate proposal created between check and insert)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already have a proposal for this project' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    )
  }
}
