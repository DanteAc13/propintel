import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { sendEmail, getAppUrl } from '@/lib/email'
import { proposalReceivedEmail } from '@/lib/email-templates'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/contractor/proposals/[id]/submit - Submit proposal for review
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR'])
    if (!auth.user) return auth.response
    const { user } = auth

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

    // Enforce ownership
    if (proposal.contractor_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
        contractor: {
          select: {
            first_name: true,
            last_name: true,
            contractor_profile: { select: { company_name: true } },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            owner: { select: { email: true, first_name: true } },
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

    // Notify homeowner about new proposal (fire-and-forget)
    const owner = updated.project.owner
    const prop = updated.project.property
    if (owner?.email && prop) {
      void (async () => {
        try {
          const contractorName = updated.contractor.contractor_profile?.company_name
            || `${updated.contractor.first_name} ${updated.contractor.last_name}`
          const appUrl = getAppUrl()
          const template = proposalReceivedEmail({
            firstName: owner.first_name,
            propertyAddress: `${prop.address_line1}, ${prop.city} ${prop.state}`,
            contractorName,
            totalAmount: Number(updated.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            viewLink: `${appUrl}/homeowner/projects/${updated.project.id}`,
          })
          await sendEmail({ to: owner.email, ...template })
        } catch (emailErr) {
          console.error('[notify] Proposal received email failed:', emailErr)
        }
      })()
    }

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
