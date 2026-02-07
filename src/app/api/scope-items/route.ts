import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// POST /api/scope-items - Create a scope item (from issue or homeowner-added)
const createScopeItemSchema = z.object({
  project_id: z.string().uuid(),
  issue_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  trade_category: z.string().min(1),
  master_format_code: z.string().optional(),
  is_homeowner_added: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createScopeItemSchema.parse(body)

    // Verify project exists and is in DRAFT status
    const project = await db.project.findUnique({
      where: { id: data.project_id },
      select: { id: true, status: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Scope items can only be added to DRAFT projects' },
        { status: 400 }
      )
    }

    // If issue_id provided, verify it exists and isn't already added
    if (data.issue_id) {
      const existingItem = await db.scopeItem.findFirst({
        where: {
          project_id: data.project_id,
          issue_id: data.issue_id,
        },
      })

      if (existingItem) {
        // If suppressed, unsuppress it
        if (existingItem.is_suppressed) {
          const updatedItem = await db.scopeItem.update({
            where: { id: existingItem.id },
            data: { is_suppressed: false },
            include: {
              issue: {
                select: {
                  id: true,
                  normalized_title: true,
                  homeowner_description: true,
                  severity_label: true,
                  trade_category: true,
                },
              },
            },
          })
          return NextResponse.json(updatedItem)
        }
        return NextResponse.json(
          { error: 'Issue already added to project scope' },
          { status: 409 }
        )
      }
    }

    // Get next order index
    const lastItem = await db.scopeItem.findFirst({
      where: { project_id: data.project_id },
      orderBy: { order_index: 'desc' },
      select: { order_index: true },
    })

    const scopeItem = await db.scopeItem.create({
      data: {
        project_id: data.project_id,
        issue_id: data.issue_id,
        title: data.title,
        description: data.description,
        trade_category: data.trade_category,
        master_format_code: data.master_format_code,
        is_homeowner_added: data.is_homeowner_added,
        is_suppressed: false,
        order_index: (lastItem?.order_index ?? -1) + 1,
      },
      include: {
        issue: {
          select: {
            id: true,
            normalized_title: true,
            homeowner_description: true,
            severity_label: true,
            trade_category: true,
          },
        },
      },
    })

    return NextResponse.json(scopeItem, { status: 201 })
  } catch (error) {
    console.error('Error creating scope item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create scope item' },
      { status: 500 }
    )
  }
}
