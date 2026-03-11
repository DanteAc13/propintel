import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { parsePagination, paginationMeta } from '@/lib/pagination'

// GET /api/properties - Get properties for authenticated user
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['HOMEOWNER', 'ADMIN'])
    if (!auth.user) return auth.response

    // HOMEOWNER: only their own properties (derived from auth, never from query params)
    // ADMIN: all properties
    const whereClause = auth.user.role === 'HOMEOWNER'
      ? { owner_id: auth.user.id }
      : {}

    const { searchParams } = new URL(request.url)
    const { skip, take, page, limit } = parsePagination(searchParams)

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where: whereClause,
        include: {
          inspections: {
            where: { status: 'APPROVED' },
            orderBy: { completed_at: 'desc' },
            take: 1,
            include: {
              _count: {
                select: { issues: true },
              },
            },
          },
          projects: {
            where: {
              status: {
                in: ['DRAFT', 'SCOPE_LOCKED', 'BIDDING', 'ACTIVE'],
              },
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      db.property.count({ where: whereClause }),
    ])

    // Transform to include summary data
    const propertiesWithSummary = properties.map((property) => {
      const latestInspection = property.inspections[0]
      const activeProject = property.projects[0]

      return {
        ...property,
        issueCount: latestInspection?._count.issues ?? 0,
        lastInspectionDate: latestInspection?.completed_at,
        hasActiveProject: !!activeProject,
        projectStatus: activeProject?.status,
      }
    })

    return NextResponse.json({
      data: propertiesWithSummary,
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}

// POST /api/properties - Create a new property
const createPropertySchema = z.object({
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().length(2).default('FL'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code'),
  county: z.string().max(100).optional().nullable(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional().nullable(),
  square_footage: z.number().int().positive().optional().nullable(),
  property_type: z.enum(['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'MOBILE_HOME']).default('SINGLE_FAMILY'),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  has_pool: z.boolean().default(false),
  lot_size_sqft: z.number().int().positive().optional().nullable(),
  stories: z.number().int().min(1).max(10).optional().nullable(),
  roof_type: z.string().max(100).optional().nullable(),
  construction_type: z.string().max(100).optional().nullable(),
  // Admin-only: create property for a specific owner
  owner_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['HOMEOWNER', 'ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = createPropertySchema.parse(body)

    // HOMEOWNER: always own property. ADMIN: can assign to any user or leave unassigned.
    let ownerId: string | null
    if (auth.user.role === 'HOMEOWNER') {
      ownerId = auth.user.id
    } else {
      ownerId = data.owner_id ?? null
      if (ownerId) {
        const owner = await db.user.findUnique({
          where: { id: ownerId, is_active: true },
          select: { id: true },
        })
        if (!owner) {
          return NextResponse.json(
            { error: 'Target owner not found or inactive' },
            { status: 404 }
          )
        }
      }
    }

    // Check for duplicate address for the same owner
    if (ownerId) {
      const existing = await db.property.findFirst({
        where: {
          owner_id: ownerId,
          address_line1: data.address_line1,
          zip_code: data.zip_code,
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'A property with this address already exists', propertyId: existing.id },
          { status: 409 }
        )
      }
    }

    const property = await db.property.create({
      data: {
        owner_id: ownerId,
        address_line1: data.address_line1,
        address_line2: data.address_line2 ?? null,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        county: data.county ?? null,
        year_built: data.year_built ?? null,
        square_footage: data.square_footage ?? null,
        property_type: data.property_type,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        has_pool: data.has_pool,
        lot_size_sqft: data.lot_size_sqft ?? null,
        stories: data.stories ?? null,
        roof_type: data.roof_type ?? null,
        construction_type: data.construction_type ?? null,
      },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
