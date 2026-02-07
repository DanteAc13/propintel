import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// GET /api/contractor/profile - Get contractor's profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const profile = await db.contractorProfile.findUnique({
      where: { user_id: userId },
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
  user_id: z.string().uuid(),
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
    const body = await request.json()
    const data = profileSchema.parse(body)

    // Check if profile exists
    const existing = await db.contractorProfile.findUnique({
      where: { user_id: data.user_id },
    })

    let profile

    if (existing) {
      // Update existing profile
      profile = await db.contractorProfile.update({
        where: { user_id: data.user_id },
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
          user_id: data.user_id,
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
