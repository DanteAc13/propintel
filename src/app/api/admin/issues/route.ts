import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { severityScoreToLabel } from '@/lib/rules-engine/issue-generator'

const createIssueSchema = z.object({
  observation_id: z.string().uuid(),
  normalized_title: z.string().min(1).max(200),
  normalized_description: z.string().min(1).max(2000),
  homeowner_description: z.string().min(1).max(2000),
  trade_category: z.string().min(1).max(100),
  master_format_code: z.string().max(20).optional().nullable(),
  severity_score: z.number().int().min(1).max(4),
  urgency: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'MONITOR']),
  is_safety_hazard: z.boolean().default(false),
  insurance_relevant: z.boolean().default(false),
  risk_category: z.string().max(100).optional().nullable(),
  // Optional: create a DefectDictionary entry at the same time
  add_to_dictionary: z.boolean().default(false),
})

// POST /api/admin/issues — Manually create an issue from an unmatched observation
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = createIssueSchema.parse(body)

    // Get the observation with its inspection context
    const observation = await db.observation.findUnique({
      where: { id: data.observation_id },
      include: {
        section: {
          select: {
            inspection_id: true,
            template_id: true,
            inspection: {
              select: { property_id: true },
            },
          },
        },
        issues: { select: { id: true }, take: 1 },
      },
    })

    if (!observation) {
      return NextResponse.json(
        { error: 'Observation not found' },
        { status: 404 }
      )
    }

    const issue = await db.issue.create({
      data: {
        observation_id: data.observation_id,
        inspection_id: observation.section.inspection_id,
        property_id: observation.section.inspection.property_id,
        normalized_title: data.normalized_title,
        normalized_description: data.normalized_description,
        homeowner_description: data.homeowner_description,
        trade_category: data.trade_category,
        master_format_code: data.master_format_code ?? null,
        severity_score: data.severity_score,
        severity_label: severityScoreToLabel(data.severity_score),
        urgency: data.urgency,
        is_safety_hazard: data.is_safety_hazard,
        insurance_relevant: data.insurance_relevant,
        risk_category: data.risk_category ?? null,
      },
    })

    // Optionally add a DefectDictionary entry so future matches work
    let dictionaryEntry = null
    if (data.add_to_dictionary) {
      try {
        dictionaryEntry = await db.defectDictionary.create({
          data: {
            section_template_id: observation.section.template_id,
            component_match: observation.component,
            condition_match: observation.status,
            severity_match: observation.severity,
            normalized_title: data.normalized_title,
            normalized_description: data.normalized_description,
            homeowner_description: data.homeowner_description,
            master_format_code: data.master_format_code ?? '',
            trade_category: data.trade_category,
            default_severity_score: data.severity_score,
            risk_category: data.risk_category ?? null,
            is_safety_hazard: data.is_safety_hazard,
            insurance_relevant: data.insurance_relevant,
          },
        })
      } catch (dictErr) {
        // Unique constraint violation means entry already exists — that's fine
        console.warn('[admin/issues] DefectDictionary entry already exists:', dictErr)
      }
    }

    return NextResponse.json({
      issue,
      dictionaryEntry,
      alreadyHadIssue: observation.issues.length > 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating manual issue:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create issue' },
      { status: 500 }
    )
  }
}
