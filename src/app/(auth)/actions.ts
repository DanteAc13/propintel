'use server'

import { createClient } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Look up the user's role in our database
  const user = await db.user.findUnique({
    where: { supabase_id: data.user.id },
  })

  if (!user) {
    return { error: 'User account not found. Please contact support.' }
  }

  // Redirect to role-specific dashboard
  const dashboardPaths: Record<Role, string> = {
    HOMEOWNER: '/homeowner/dashboard',
    INSPECTOR: '/inspector/dashboard',
    CONTRACTOR: '/contractor/dashboard',
    ADMIN: '/admin/dashboard',
  }

  redirect(dashboardPaths[user.role])
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const role = (formData.get('role') as Role) || 'HOMEOWNER'

  if (!email || !password || !firstName || !lastName) {
    return { error: 'All fields are required' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  const validRoles: Role[] = ['HOMEOWNER', 'INSPECTOR', 'CONTRACTOR']
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role selected' }
  }

  // Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, first_name: firstName, last_name: lastName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Failed to create account' }
  }

  // Create user in our database
  try {
    await db.user.create({
      data: {
        supabase_id: data.user.id,
        email,
        role,
        first_name: firstName,
        last_name: lastName,
        email_verified: !!data.user.email_confirmed_at,
      },
    })
  } catch (dbError) {
    // If DB user creation fails, the auth user still exists
    // but we can handle this gracefully
    console.error('Failed to create database user:', dbError)
    return { error: 'Account created but profile setup failed. Please log in.' }
  }

  // Redirect to role-specific dashboard
  const dashboardPaths: Record<Role, string> = {
    HOMEOWNER: '/homeowner/dashboard',
    INSPECTOR: '/inspector/dashboard',
    CONTRACTOR: '/contractor/dashboard',
    ADMIN: '/admin/dashboard',
  }

  redirect(dashboardPaths[role])
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
