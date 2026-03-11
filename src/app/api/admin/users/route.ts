import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/users - Get users for admin management
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'HOMEOWNER', 'INSPECTOR', 'CONTRACTOR', 'ADMIN', or null for all
    const search = searchParams.get('search') // Search by name or email
    const isActive = searchParams.get('is_active') // 'true', 'false', or null for all
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const where: object = {
      ...(role && { role: role as 'HOMEOWNER' | 'INSPECTOR' | 'CONTRACTOR' | 'ADMIN' }),
      ...(isActive !== null && { is_active: isActive === 'true' }),
      ...(search && {
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          avatar_url: true,
          is_active: true,
          email_verified: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              owned_properties: true,
              assigned_inspections: true,
              owned_projects: true,
              proposals: true,
            },
          },
          contractor_profile: {
            select: {
              id: true,
              company_name: true,
              status: true,
              trade_categories: true,
            },
          },
        },
        orderBy: [
          { created_at: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.user.count({ where }),
    ])

    // Transform to add summary stats
    const usersWithStats = users.map((user) => ({
      ...user,
      stats: {
        properties: user._count.owned_properties,
        inspections: user._count.assigned_inspections,
        projects: user._count.owned_projects,
        proposals: user._count.proposals,
      },
      _count: undefined, // Remove raw count
    }))

    return NextResponse.json({
      users: usersWithStats,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// Trade category → MasterFormat code mapping (matches contractor profile route)
const TRADE_TO_MASTERFORMAT: Record<string, string> = {
  'Roofing': '07-00-00',
  'Electrical': '26-00-00',
  'Plumbing': '22-00-00',
  'HVAC': '23-00-00',
  'General': '01-00-00',
  'Painting': '09-90-00',
  'Flooring': '09-60-00',
  'Structural': '03-00-00',
  'Insulation': '07-20-00',
  'Landscaping': '32-90-00',
  'Pool/Spa': '13-11-00',
  'Windows/Doors': '08-00-00',
  'Appliance Repair': '11-30-00',
  'Pest Control': '01-81-00',
}

// POST /api/admin/users - Create a new user account
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['HOMEOWNER', 'INSPECTOR', 'CONTRACTOR', 'ADMIN']),
  phone: z.string().max(20).optional().nullable(),
  // Contractor-specific fields
  company_name: z.string().min(1).max(200).optional(),
  trade_categories: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = createUserSchema.parse(body)

    // Contractor must have company_name
    if (data.role === 'CONTRACTOR' && !data.company_name) {
      return NextResponse.json(
        { error: 'Company name is required for contractor accounts' },
        { status: 400 }
      )
    }

    // Check for existing user with same email
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase Auth user (admin API — skips email verification)
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
      },
    })

    if (supabaseError || !supabaseUser.user) {
      console.error('Supabase user creation failed:', supabaseError)
      // Handle "already registered" as 409 instead of 500
      if (supabaseError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: supabaseError?.message || 'Failed to create auth user' },
        { status: 500 }
      )
    }

    try {
      // Create DB user + contractor profile in a transaction
      const user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            supabase_id: supabaseUser.user.id,
            email: data.email,
            role: data.role,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone ?? null,
            email_verified: true,
            is_active: true,
          },
        })

        // Auto-create contractor profile for CONTRACTOR role
        if (data.role === 'CONTRACTOR' && data.company_name) {
          const trades = data.trade_categories ?? []
          const masterFormatCodes = trades
            .map((t) => TRADE_TO_MASTERFORMAT[t])
            .filter(Boolean)

          await tx.contractorProfile.create({
            data: {
              user_id: newUser.id,
              company_name: data.company_name,
              trade_categories: trades,
              master_format_codes: masterFormatCodes,
              status: 'ACTIVE', // Admin-created = pre-verified
              verified_at: new Date(),
              verified_by_id: auth.user!.id,
            },
          })
        }

        return newUser
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      }, { status: 201 })
    } catch (dbError) {
      // Cleanup: delete the Supabase user if DB creation failed
      console.error('DB user creation failed, cleaning up Supabase user:', dbError)
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUser.user.id)
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphaned Supabase user:', supabaseUser.user.id, cleanupErr)
      }
      throw dbError
    }
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
