import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/lock-scope - Lock the scope and create a snapshot for bidding
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get project with scope items
    const project = await db.project.findUnique({
      where: { id },
      include: {
        scope_items: {
          where: { is_suppressed: false },
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
              },
            },
          },
          orderBy: { order_index: 'asc' },
        },
        scope_snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Scope can only be locked for DRAFT projects' },
        { status: 400 }
      )
    }

    if (project.scope_items.length === 0) {
      return NextResponse.json(
        { error: 'Cannot lock scope with no active items. Select at least one issue to fix.' },
        { status: 400 }
      )
    }

    // Calculate next version number
    const nextVersion = (project.scope_snapshots[0]?.version ?? 0) + 1

    // Create scope snapshot with frozen scope data
    const scopeData = project.scope_items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      trade_category: item.trade_category,
      master_format_code: item.master_format_code,
      is_homeowner_added: item.is_homeowner_added,
      order_index: item.order_index,
      issue: item.issue,
    }))

    // Use transaction to update project and create snapshot
    const result = await db.$transaction(async (tx) => {
      // Mark previous snapshots as inactive
      if (project.scope_snapshots.length > 0) {
        await tx.scopeSnapshot.updateMany({
          where: { project_id: id },
          data: { is_active: false },
        })
      }

      // Create new snapshot
      const snapshot = await tx.scopeSnapshot.create({
        data: {
          project_id: id,
          version: nextVersion,
          scope_data: scopeData,
          is_active: true,
        },
      })

      // Update project status
      const updatedProject = await tx.project.update({
        where: { id },
        data: {
          status: 'BIDDING',
          scope_locked_at: new Date(),
        },
        include: {
          property: {
            select: {
              id: true,
              address_line1: true,
              city: true,
              state: true,
            },
          },
          scope_items: {
            where: { is_suppressed: false },
          },
        },
      })

      return { project: updatedProject, snapshot }
    })

    return NextResponse.json({
      message: 'Scope locked successfully. Project is now open for bidding.',
      project: result.project,
      snapshot: {
        id: result.snapshot.id,
        version: result.snapshot.version,
        locked_at: result.snapshot.locked_at,
        item_count: scopeData.length,
      },
    })
  } catch (error) {
    console.error('Error locking scope:', error)
    return NextResponse.json(
      { error: 'Failed to lock scope' },
      { status: 500 }
    )
  }
}
