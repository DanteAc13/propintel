import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/select-contractor - Accept a proposal and reject others
const selectContractorSchema = z.object({
  proposal_id: z.string().uuid(),
  owner_id: z.string().uuid(),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
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

    if (project.owner_id !== data.owner_id) {
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

    // Execute in transaction: accept selected, reject others, update project status
    const result = await db.$transaction(async (tx) => {
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
    return NextResponse.json(
      { error: 'Failed to select contractor' },
      { status: 500 }
    )
  }
}
