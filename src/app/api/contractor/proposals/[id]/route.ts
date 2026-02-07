import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/contractor/proposals/[id] - Get proposal detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            property: {
              select: {
                id: true,
                address_line1: true,
                address_line2: true,
                city: true,
                state: true,
                zip_code: true,
              },
            },
          },
        },
        scope_snapshot: {
          select: {
            id: true,
            version: true,
            locked_at: true,
          },
        },
        items: {
          include: {
            scope_item: {
              select: {
                id: true,
                title: true,
                description: true,
                trade_category: true,
                master_format_code: true,
                issue: {
                  select: {
                    normalized_title: true,
                    severity_label: true,
                    observation: {
                      select: {
                        media: {
                          take: 3,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            contractor_profile: {
              select: {
                company_name: true,
              },
            },
          },
        },
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // If user_id provided, verify ownership
    if (userId && proposal.contractor_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(proposal)
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    )
  }
}

// PUT /api/contractor/proposals/[id] - Update proposal (draft only)
const updateProposalSchema = z.object({
  items: z.array(z.object({
    scope_item_id: z.string().uuid(),
    line_item_cost: z.number().min(0),
    notes: z.string().optional().nullable(),
  })).optional(),
  notes: z.string().optional().nullable(),
  estimated_start_date: z.string().optional().nullable(),
  estimated_duration_days: z.number().int().min(1).optional().nullable(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateProposalSchema.parse(body)

    // Get existing proposal
    const existing = await db.proposal.findUnique({
      where: { id },
      select: { status: true, contractor_id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft proposals can be edited' },
        { status: 400 }
      )
    }

    // Update in transaction
    const proposal = await db.$transaction(async (tx) => {
      // Update items if provided
      if (data.items) {
        // Delete existing items
        await tx.proposalItem.deleteMany({
          where: { proposal_id: id },
        })

        // Create new items
        await tx.proposalItem.createMany({
          data: data.items.map((item) => ({
            proposal_id: id,
            scope_item_id: item.scope_item_id,
            line_item_cost: item.line_item_cost,
            notes: item.notes,
          })),
        })
      }

      // Calculate new total
      const items = data.items ?? (await tx.proposalItem.findMany({
        where: { proposal_id: id },
        select: { line_item_cost: true },
      }))
      const totalAmount = items.reduce(
        (sum, item) => sum + Number(item.line_item_cost),
        0
      )

      // Update proposal
      return tx.proposal.update({
        where: { id },
        data: {
          total_amount: totalAmount,
          notes: data.notes,
          estimated_start_date: data.estimated_start_date
            ? new Date(data.estimated_start_date)
            : undefined,
          estimated_duration_days: data.estimated_duration_days,
        },
        include: {
          items: {
            include: {
              scope_item: {
                select: {
                  id: true,
                  title: true,
                  trade_category: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(proposal)
  } catch (error) {
    console.error('Error updating proposal:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update proposal' },
      { status: 500 }
    )
  }
}
