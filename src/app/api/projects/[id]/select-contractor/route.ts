import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { sendEmail, getAppUrl } from '@/lib/email'
import { contractorSelectedEmail } from '@/lib/email-templates'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/select-contractor - Accept a proposal and reject others
const selectContractorSchema = z.object({
  proposal_id: z.string().uuid(),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['HOMEOWNER'])
    if (!auth.user) return auth.response

    const { id: projectId } = await params
    const body = await request.json()
    const data = selectContractorSchema.parse(body)

    // Verify project exists and is in BIDDING status
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        status: true,
        owner_id: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify ownership using authenticated user
    if (project.owner_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Only the project owner can select a contractor' },
        { status: 403 }
      )
    }

    if (project.status !== 'BIDDING') {
      return NextResponse.json(
        { error: 'Contractor can only be selected for projects in BIDDING status' },
        { status: 400 }
      )
    }

    // Verify the proposal exists, is submitted, and belongs to this project
    const proposal = await db.proposal.findUnique({
      where: { id: data.proposal_id },
      select: {
        id: true,
        status: true,
        project_id: true,
        contractor_id: true,
      },
    })

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      )
    }

    if (proposal.project_id !== projectId) {
      return NextResponse.json(
        { error: 'Proposal does not belong to this project' },
        { status: 400 }
      )
    }

    if (proposal.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Only submitted proposals can be accepted' },
        { status: 400 }
      )
    }

    // Execute in transaction with status guards to prevent TOCTOU race
    const result = await db.$transaction(async (tx) => {
      // Re-check project status INSIDE the transaction to prevent race
      const freshProject = await tx.project.findUnique({
        where: { id: projectId },
        select: { status: true },
      })

      if (!freshProject || freshProject.status !== 'BIDDING') {
        throw new Error('CONFLICT: Project is no longer in BIDDING status')
      }

      // Re-check proposal status INSIDE the transaction
      const freshProposal = await tx.proposal.findUnique({
        where: { id: data.proposal_id },
        select: { status: true, project_id: true },
      })

      if (!freshProposal || freshProposal.status !== 'SUBMITTED' || freshProposal.project_id !== projectId) {
        throw new Error('CONFLICT: Proposal is no longer valid for acceptance')
      }

      // Accept the selected proposal
      const acceptedProposal = await tx.proposal.update({
        where: { id: data.proposal_id },
        data: { status: 'ACCEPTED' },
        include: {
          contractor: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              contractor_profile: {
                select: { company_name: true },
              },
            },
          },
        },
      })

      // Reject all other submitted proposals for this project
      await tx.proposal.updateMany({
        where: {
          project_id: projectId,
          id: { not: data.proposal_id },
          status: 'SUBMITTED',
        },
        data: { status: 'REJECTED' },
      })

      // Update project to ACTIVE status
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: { status: 'ACTIVE' },
        include: {
          property: {
            select: {
              address_line1: true,
              city: true,
              state: true,
            },
          },
        },
      })

      return { project: updatedProject, proposal: acceptedProposal }
    })

    // Notify selected contractor (fire-and-forget)
    void (async () => {
      try {
        const contractor = result.proposal.contractor
        if (contractor?.email) {
          const prop = result.project.property
          const address = `${prop.address_line1}, ${prop.city} ${prop.state}`
          const appUrl = getAppUrl()
          const template = contractorSelectedEmail({
            contractorFirstName: contractor.first_name,
            propertyAddress: address,
            totalAmount: Number(result.proposal.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            viewLink: `${appUrl}/contractor/projects/${projectId}`,
          })
          await sendEmail({ to: contractor.email, ...template })
        }
      } catch (emailErr) {
        console.error('[notify] Contractor selected email failed:', emailErr)
      }
    })()

    return NextResponse.json({
      message: 'Contractor selected successfully',
      project: result.project,
      selectedProposal: result.proposal,
    })
  } catch (error) {
    console.error('Error selecting contractor:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    // Handle TOCTOU race condition — concurrent request already changed state
    if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
      return NextResponse.json(
        { error: error.message.replace('CONFLICT: ', '') },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to select contractor' },
      { status: 500 }
    )
  }
}
