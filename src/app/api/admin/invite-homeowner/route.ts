import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, getAppUrl } from '@/lib/email'
import { inviteHomeownerEmail } from '@/lib/email-templates'

const inviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  property_id: z.string().uuid().optional(),
  phone: z.string().max(20).optional().nullable(),
})

// POST /api/admin/invite-homeowner — Create homeowner account + send invite
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    const body = await request.json()
    const data = inviteSchema.parse(body)

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

    // If property_id provided, pre-fetch for address (used in email)
    let propertyAddress: string | undefined
    if (data.property_id) {
      const property = await db.property.findUnique({
        where: { id: data.property_id },
        select: { id: true, address_line1: true, city: true, state: true, owner_id: true },
      })
      if (!property) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
      if (property.owner_id) {
        return NextResponse.json(
          { error: 'Property already has an owner assigned' },
          { status: 409 }
        )
      }
      propertyAddress = `${property.address_line1}, ${property.city} ${property.state}`
    }

    const appUrl = getAppUrl()
    const redirectTo = `${appUrl}/auth/callback?next=/homeowner/dashboard`

    // Use Supabase generateLink to create user + get invite link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: data.email,
      options: {
        redirectTo,
        data: {
          role: 'HOMEOWNER',
          first_name: data.first_name,
          last_name: data.last_name,
        },
      },
    })

    if (linkError || !linkData.user) {
      console.error('Supabase invite link generation failed:', linkError)
      if (linkError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'A user with this email already exists in auth' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: linkError?.message || 'Failed to generate invite link' },
        { status: 500 }
      )
    }

    const inviteLink = linkData.properties.action_link

    // Create DB user — property owner_id re-checked inside transaction to prevent race
    let dbUser
    try {
      dbUser = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            supabase_id: linkData.user.id,
            email: data.email,
            role: 'HOMEOWNER',
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone ?? null,
            email_verified: false, // Will be verified when they accept invite
            is_active: true,
          },
        })

        // Assign property if provided — re-check owner_id inside transaction
        if (data.property_id) {
          const result = await tx.property.updateMany({
            where: { id: data.property_id, owner_id: null },
            data: { owner_id: newUser.id },
          })
          if (result.count === 0) {
            throw new Error('PROPERTY_TAKEN')
          }
        }

        return newUser
      })
    } catch (dbError) {
      // Cleanup Supabase user if DB creation failed
      console.error('DB user creation failed, cleaning up Supabase user:', dbError)
      try {
        await supabaseAdmin.auth.admin.deleteUser(linkData.user.id)
      } catch (cleanupErr) {
        console.error('Failed to cleanup Supabase user:', linkData.user.id, cleanupErr)
      }
      if (dbError instanceof Error && dbError.message === 'PROPERTY_TAKEN') {
        return NextResponse.json(
          { error: 'Property was assigned to another owner' },
          { status: 409 }
        )
      }
      throw dbError
    }

    // Send invite email
    const template = inviteHomeownerEmail({
      firstName: data.first_name,
      propertyAddress,
      inviteLink,
    })

    const emailResult = await sendEmail({
      to: data.email,
      subject: template.subject,
      html: template.html,
    })

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      role: dbUser.role,
      property_assigned: !!data.property_id,
      email_sent: emailResult.sent,
      // Include invite link if email wasn't sent (so admin can share manually)
      ...(!emailResult.sent && { invite_link: inviteLink }),
    }, { status: 201 })
  } catch (error) {
    console.error('Error inviting homeowner:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to invite homeowner' },
      { status: 500 }
    )
  }
}
