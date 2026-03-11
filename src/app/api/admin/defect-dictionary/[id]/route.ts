import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

const updateEntrySchema = z.object({
  component_match: z.string().min(1).max(200).optional(),
  condition_match: z.enum(['DEFICIENT', 'FUNCTIONAL', 'NOT_INSPECTED', 'NOT_PRESENT', 'MAINTENANCE_NEEDED']).optional(),
  severity_match: z.enum(['SAFETY_HAZARD', 'MAJOR_DEFECT', 'MINOR_DEFECT', 'COSMETIC', 'INFORMATIONAL']).optional().nullable(),
  normalized_title: z.string().min(1).max(200).optional(),
  normalized_description: z.string().min(1).max(2000).optional(),
  homeowner_description: z.string().min(1).max(2000).optional(),
  master_format_code: z.string().max(20).optional(),
  trade_category: z.string().min(1).max(100).optional(),
  default_severity_score: z.number().int().min(1).max(4).optional(),
  risk_category: z.string().max(100).optional().nullable(),
  is_safety_hazard: z.boolean().optional(),
  insurance_relevant: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

// PUT /api/admin/defect-dictionary/[id] — Update entry
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const { id } = await params
    const body = await request.json()
    const data = updateEntrySchema.parse(body)

    const existing = await db.defectDictionary.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    const updated = await db.defectDictionary.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating defect dictionary entry:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    )
  }
}
