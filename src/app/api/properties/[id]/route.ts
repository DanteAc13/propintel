import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/properties/[id] - Get property details with latest approved inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(['HOMEOWNER', 'INSPECTOR', 'ADMIN'])
    if (!auth.user) return auth.response

    const { id } = await params

    const property = await db.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        inspections: {
          where: { status: 'APPROVED' },
          orderBy: { completed_at: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            completed_at: true,
            approved_at: true,
          },
        },
        projects: {
          orderBy: { created_at: 'desc' },
          include: {
            _count: {
              select: {
                scope_items: {
                  where: { is_suppressed: false },
                },
              },
            },
          },
        },
      },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // HOMEOWNER: must own the property
    if (auth.user.role === 'HOMEOWNER' && property.owner_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this property' },
        { status: 403 }
      )
    }

    // INSPECTOR: must have an assigned inspection on this property
    if (auth.user.role === 'INSPECTOR') {
      const hasAccess = await db.inspection.findFirst({
        where: { property_id: id, inspector_id: auth.user.id },
      })
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this property' },
          { status: 403 }
        )
      }
    }

    // ADMIN: pass

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}
