import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import type { Prisma } from '@prisma/client'

// GET /api/admin/defect-dictionary — List all entries, filterable
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('section_template_id')
    const trade = searchParams.get('trade_category')
    const search = searchParams.get('search')

    const where: Prisma.DefectDictionaryWhereInput = { is_active: true }
    if (sectionId) where.section_template_id = sectionId
    if (trade) where.trade_category = trade
    if (search) {
      where.OR = [
        { component_match: { contains: search, mode: 'insensitive' } },
        { normalized_title: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [entries, templates] = await Promise.all([
      db.defectDictionary.findMany({
        where,
        include: {
          section_template: { select: { name: true } },
        },
        orderBy: [
          { section_template: { order_index: 'asc' } },
          { component_match: 'asc' },
        ],
      }),
      db.sectionTemplate.findMany({
        where: { is_active: true },
        select: { id: true, name: true },
        orderBy: { order_index: 'asc' },
      }),
    ])

    // Collect unique trade categories for filter dropdown
    const trades = [...new Set(entries.map(e => e.trade_category))].sort()

    return NextResponse.json({
      count: entries.length,
      entries,
      templates,
      trades,
    })
  } catch (error) {
    console.error('Error fetching defect dictionary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch defect dictionary' },
      { status: 500 }
    )
  }
}

// POST /api/admin/defect-dictionary — Create new entry
const createEntrySchema = z.object({
  section_template_id: z.string().uuid(),
  component_match: z.string().min(1).max(200),
  condition_match: z.enum(['DEFICIENT', 'FUNCTIONAL', 'NOT_INSPECTED', 'NOT_PRESENT', 'MAINTENANCE_NEEDED']),
  severity_match: z.enum(['SAFETY_HAZARD', 'MAJOR_DEFECT', 'MINOR_DEFECT', 'COSMETIC', 'INFORMATIONAL']).optional().nullable(),
  normalized_title: z.string().min(1).max(200),
  normalized_description: z.string().min(1).max(2000),
  homeowner_description: z.string().min(1).max(2000),
  master_format_code: z.string().max(20),
  trade_category: z.string().min(1).max(100),
  default_severity_score: z.number().int().min(1).max(4),
  risk_category: z.string().max(100).optional().nullable(),
  is_safety_hazard: z.boolean().default(false),
  insurance_relevant: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = createEntrySchema.parse(body)

    const entry = await db.defectDictionary.create({
      data: {
        ...data,
        severity_match: data.severity_match ?? null,
        risk_category: data.risk_category ?? null,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Error creating defect dictionary entry:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    )
  }
}
