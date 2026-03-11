import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/contractor/profile - Get contractor's profile
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    // ADMIN can optionally view another contractor's profile
    const { searchParams } = new URL(request.url)
    const targetUserId =
      user.role === 'ADMIN' && searchParams.get('user_id')
        ? searchParams.get('user_id')!
        : user.id

    const profile = await db.contractorProfile.findUnique({
      where: { user_id: targetUserId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            avatar_url: true,
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

    if (!profile) {
      return NextResponse.json(
        { error: 'Contractor profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching contractor profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PUT /api/contractor/profile - Create or update contractor profile
const profileSchema = z.object({
  company_name: z.string().min(1),
  license_number: z.string().optional().nullable(),
  license_image_url: z.string().url().optional().nullable(),
  insurance_cert_url: z.string().url().optional().nullable(),
  trade_categories: z.array(z.string()).min(1),
  master_format_codes: z.array(z.string()).default([]),
  service_radius_miles: z.number().int().min(1).max(500).default(50),
  bio: z.string().optional().nullable(),
  years_experience: z.number().int().min(0).max(100).optional().nullable(),
})

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['CONTRACTOR', 'ADMIN'])
    if (!auth.user) return auth.response
    const { user } = auth

    const body = await request.json()
    const data = profileSchema.parse(body)

    const targetUserId = user.id

    // Check if profile exists
    const existing = await db.contractorProfile.findUnique({
      where: { user_id: targetUserId },
    })

    let profile

    if (existing) {
      // Update existing profile
      profile = await db.contractorProfile.update({
        where: { user_id: targetUserId },
        data: {
          company_name: data.company_name,
          license_number: data.license_number,
          license_image_url: data.license_image_url,
          insurance_cert_url: data.insurance_cert_url,
          trade_categories: data.trade_categories,
          master_format_codes: data.master_format_codes,
          service_radius_miles: data.service_radius_miles,
          bio: data.bio,
          years_experience: data.years_experience,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
      })
    } else {
      // Create new profile (status is PENDING by default)
      profile = await db.contractorProfile.create({
        data: {
          user_id: targetUserId,
          company_name: data.company_name,
          license_number: data.license_number,
          license_image_url: data.license_image_url,
          insurance_cert_url: data.insurance_cert_url,
          trade_categories: data.trade_categories,
          master_format_codes: data.master_format_codes,
          service_radius_miles: data.service_radius_miles,
          bio: data.bio,
          years_experience: data.years_experience,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error updating contractor profile:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
