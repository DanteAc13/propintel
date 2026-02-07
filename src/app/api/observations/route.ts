import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { matchObservation, generateIssue } from '@/lib/rules-engine'

const createObservationSchema = z.object({
  section_id: z.string().uuid(),
  component: z.string().min(1),
  description_raw: z.string().optional().nullable(),
  status: z.enum(['DEFICIENT', 'FUNCTIONAL', 'NOT_INSPECTED', 'NOT_PRESENT', 'MAINTENANCE_NEEDED']),
  severity: z.enum(['SAFETY_HAZARD', 'MAJOR_DEFECT', 'MINOR_DEFECT', 'COSMETIC', 'INFORMATIONAL']),
  urgency: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'MONITOR']).optional(),
  location_detail: z.string().optional().nullable(),
  inspector_notes: z.string().optional().nullable(),
  media_ids: z.array(z.string().uuid()).optional(),
})

// POST /api/observations - Create observation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createObservationSchema.parse(body)

    // Get section to determine order_index and get template info
    const section = await db.section.findUnique({
      where: { id: data.section_id },
      include: {
        observations: true,
        template: true,
        inspection: true,
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Auto-calculate urgency based on severity if not provided
    const urgency = data.urgency || calculateUrgency(data.severity)

    // Create observation
    const observation = await db.observation.create({
      data: {
        section_id: data.section_id,
        component: data.component,
        description_raw: data.description_raw,
        status: data.status,
        severity: data.severity,
        urgency,
        location_detail: data.location_detail,
        inspector_notes: data.inspector_notes,
        order_index: section.observations.length,
      },
      include: {
        media: true,
      },
    })

    // Link existing media to this observation
    if (data.media_ids && data.media_ids.length > 0) {
      await db.media.updateMany({
        where: { id: { in: data.media_ids } },
        data: { observation_id: observation.id },
      })
    }

    // Run rules engine to generate issue
    const matchResult = await matchObservation({
      sectionTemplateId: section.template_id,
      component: data.component,
      status: data.status,
      severity: data.severity,
    })

    let issue = null
    if (matchResult.matched) {
      const issueData = generateIssue({
        observationId: observation.id,
        inspectionId: section.inspection_id,
        propertyId: section.inspection.property_id,
        matchResult,
        urgency,
      })

      if (issueData) {
        issue = await db.issue.create({
          data: issueData,
        })
      }
    }

    // Fetch updated observation with media
    const updatedObservation = await db.observation.findUnique({
      where: { id: observation.id },
      include: { media: true },
    })

    return NextResponse.json({
      observation: updatedObservation,
      issue,
      matchResult,
    })
  } catch (error) {
    console.error('Error creating observation:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create observation' },
      { status: 500 }
    )
  }
}

function calculateUrgency(severity: string): 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'MONITOR' {
  switch (severity) {
    case 'SAFETY_HAZARD':
      return 'IMMEDIATE'
    case 'MAJOR_DEFECT':
      return 'SHORT_TERM'
    case 'MINOR_DEFECT':
      return 'LONG_TERM'
    case 'COSMETIC':
    case 'INFORMATIONAL':
    default:
      return 'MONITOR'
  }
}
