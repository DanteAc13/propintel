import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/scope-items/[id] - Get a single scope item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const scopeItem = await db.scopeItem.findUnique({
      where: { id },
      include: {
        issue: {
          select: {
            id: true,
            normalized_title: true,
            normalized_description: true,
            homeowner_description: true,
            severity_label: true,
            severity_score: true,
            trade_category: true,
            master_format_code: true,
            urgency: true,
            is_safety_hazard: true,
            observation: {
              include: {
                media: {
                  take: 5,
                  orderBy: { created_at: 'desc' },
                },
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            status: true,
            title: true,
          },
        },
      },
    })

    if (!scopeItem) {
      return NextResponse.json(
        { error: 'Scope item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(scopeItem)
  } catch (error) {
    console.error('Error fetching scope item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scope item' },
      { status: 500 }
    )
  }
}

// PUT /api/scope-items/[id] - Update scope item (toggle suppression, update details)
const updateScopeItemSchema = z.object({
  is_suppressed: z.boolean().optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  order_index: z.number().int().min(0).optional(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateScopeItemSchema.parse(body)

    // Verify scope item exists and project is editable
    const existing = await db.scopeItem.findUnique({
      where: { id },
      include: {
        project: {
          select: { status: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Scope item not found' },
        { status: 404 }
      )
    }

    if (existing.project.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Scope items can only be modified for DRAFT projects' },
        { status: 400 }
      )
    }

    const scopeItem = await db.scopeItem.update({
      where: { id },
      data,
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

    return NextResponse.json(scopeItem)
  } catch (error) {
    console.error('Error updating scope item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update scope item' },
      { status: 500 }
    )
  }
}

// DELETE /api/scope-items/[id] - Remove scope item (only homeowner-added items)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.scopeItem.findUnique({
      where: { id },
      include: {
        project: {
          select: { status: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Scope item not found' },
        { status: 404 }
      )
    }

    if (existing.project.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Scope items can only be deleted from DRAFT projects' },
        { status: 400 }
      )
    }

    // Only allow deleting homeowner-added items; issue-based items should be suppressed
    if (!existing.is_homeowner_added) {
      return NextResponse.json(
        { error: 'Issue-based scope items cannot be deleted. Use suppression instead.' },
        { status: 400 }
      )
    }

    await db.scopeItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Scope item deleted' })
  } catch (error) {
    console.error('Error deleting scope item:', error)
    return NextResponse.json(
      { error: 'Failed to delete scope item' },
      { status: 500 }
    )
  }
}
