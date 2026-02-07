import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/contractor/proposals/[id]/submit - Submit proposal for review
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get proposal with items
    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        items: true,
        project: {
          select: { status: true },
        },
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (proposal.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft proposals can be submitted' },
        { status: 400 }
      )
    }

    if (proposal.project.status !== 'BIDDING') {
      return NextResponse.json(
        { error: 'Project is no longer accepting bids' },
        { status: 400 }
      )
    }

    if (proposal.items.length === 0) {
      return NextResponse.json(
        { error: 'Proposal must have at least one line item' },
        { status: 400 }
      )
    }

    // Verify all items have a cost
    const invalidItems = proposal.items.filter(
      (item) => Number(item.line_item_cost) <= 0
    )
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: 'All line items must have a cost greater than 0' },
        { status: 400 }
      )
    }

    // Submit the proposal
    const updated = await db.proposal.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            property: {
              select: {
                address_line1: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Proposal submitted successfully',
      proposal: updated,
    })
  } catch (error) {
    console.error('Error submitting proposal:', error)
    return NextResponse.json(
      { error: 'Failed to submit proposal' },
      { status: 500 }
    )
  }
}
