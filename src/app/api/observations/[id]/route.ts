import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { matchObservation, generateIssue } from '@/lib/rules-engine'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/observations/[id] - Get observation with media
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const observation = await db.observation.findUnique({
      where: { id },
      include: {
        media: true,
        section: {
          include: {
            template: true,
            inspection: true,
          },
        },
        issues: true,
      },
    })

    if (!observation) {
      return NextResponse.json(
        { error: 'Observation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(observation)
  } catch (error) {
    console.error('Error fetching observation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch observation' },
      { status: 500 }
    )
  }
}

const updateObservationSchema = z.object({
  component: z.string().min(1).optional(),
  description_raw: z.string().optional().nullable(),
  status: z.enum(['DEFICIENT', 'FUNCTIONAL', 'NOT_INSPECTED', 'NOT_PRESENT', 'MAINTENANCE_NEEDED']).optional(),
  severity: z.enum(['SAFETY_HAZARD', 'MAJOR_DEFECT', 'MINOR_DEFECT', 'COSMETIC', 'INFORMATIONAL']).optional(),
  urgency: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'MONITOR']).optional(),
  location_detail: z.string().optional().nullable(),
  inspector_notes: z.string().optional().nullable(),
})

// PUT /api/observations/[id] - Update observation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateObservationSchema.parse(body)

    // Get current observation with section info
    const currentObs = await db.observation.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            template: true,
            inspection: true,
          },
        },
        issues: true,
      },
    })

    if (!currentObs) {
      return NextResponse.json(
        { error: 'Observation not found' },
        { status: 404 }
      )
    }

    // Update observation
    const observation = await db.observation.update({
      where: { id },
      data,
      include: { media: true },
    })

    // If status or severity changed, re-run rules engine
    let issue = null
    if (data.status || data.severity) {
      // Delete existing issues for this observation
      await db.issue.deleteMany({
        where: { observation_id: id },
      })

      // Re-run rules engine
      const matchResult = await matchObservation({
        sectionTemplateId: currentObs.section.template_id,
        component: data.component || currentObs.component,
        status: data.status || currentObs.status,
        severity: data.severity || currentObs.severity,
      })

      if (matchResult.matched) {
        const issueData = generateIssue({
          observationId: id,
          inspectionId: currentObs.section.inspection_id,
          propertyId: currentObs.section.inspection.property_id,
          matchResult,
          urgency: data.urgency || observation.urgency,
        })

        if (issueData) {
          issue = await db.issue.create({
            data: issueData,
          })
        }
      }
    }

    return NextResponse.json({ observation, issue })
  } catch (error) {
    console.error('Error updating observation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update observation' },
      { status: 500 }
    )
  }
}

// DELETE /api/observations/[id] - Delete observation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Delete associated issues first
    await db.issue.deleteMany({
      where: { observation_id: id },
    })

    // Delete observation (media will be unlinked due to onDelete: SetNull)
    await db.observation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting observation:', error)
    return NextResponse.json(
      { error: 'Failed to delete observation' },
      { status: 500 }
    )
  }
}
