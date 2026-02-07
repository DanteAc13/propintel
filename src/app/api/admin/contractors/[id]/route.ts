import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/admin/contractors/[id] - Get contractor profile details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const contractor = await db.contractorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            avatar_url: true,
            created_at: true,
            is_active: true,
            proposals: {
              select: {
                id: true,
                status: true,
                total_amount: true,
                created_at: true,
                project: {
                  select: {
                    id: true,
                    title: true,
                    property: {
                      select: {
                        address_line1: true,
                        city: true,
                        state: true,
                      },
                    },
                  },
                },
              },
              orderBy: { created_at: 'desc' },
              take: 10,
            },
          },
        },
        verified_by: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    })

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(contractor)
  } catch (error) {
    console.error('Error fetching contractor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/contractors/[id] - Verify, suspend, or update contractor
const updateContractorSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'reactivate']),
  admin_id: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateContractorSchema.parse(body)

    const contractor = await db.contractorProfile.findUnique({
      where: { id },
      select: { status: true, user_id: true },
    })

    if (!contractor) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      )
    }

    let updateData: object = {}
    let userUpdate: object | null = null

    switch (data.action) {
      case 'approve':
        if (contractor.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Can only approve PENDING contractors' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'ACTIVE',
          verified_at: new Date(),
          verified_by_id: data.admin_id,
        }
        break

      case 'reject':
        if (contractor.status !== 'PENDING') {
          return NextResponse.json(
            { error: 'Can only reject PENDING contractors' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'REJECTED',
        }
        // Optionally deactivate the user account
        userUpdate = { is_active: false }
        break

      case 'suspend':
        if (contractor.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Can only suspend ACTIVE contractors' },
            { status: 400 }
          )
        }
        updateData = { status: 'SUSPENDED' }
        userUpdate = { is_active: false }
        break

      case 'reactivate':
        if (contractor.status !== 'SUSPENDED') {
          return NextResponse.json(
            { error: 'Can only reactivate SUSPENDED contractors' },
            { status: 400 }
          )
        }
        updateData = { status: 'ACTIVE' }
        userUpdate = { is_active: true }
        break
    }

    // Use transaction if we need to update both contractor and user
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.contractorProfile.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      })

      if (userUpdate) {
        await tx.user.update({
          where: { id: contractor.user_id },
          data: userUpdate,
        })
      }

      return updated
    })

    return NextResponse.json({
      message: `Contractor ${data.action}${data.action.endsWith('e') ? 'd' : 'ed'} successfully`,
      contractor: result,
    })
  } catch (error) {
    console.error('Error updating contractor:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update contractor' },
      { status: 500 }
    )
  }
}
