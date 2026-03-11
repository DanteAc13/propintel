// src/lib/auth.ts
// Supabase Auth helpers for server-side authentication
//
// Uses @supabase/ssr for cookie-based session management in Next.js App Router

import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from './db'
import type { Role } from '@prisma/client'

// Create Supabase client for server components
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// Get the current authenticated user from Supabase
export async function getSupabaseUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

// Get the current user from our database (with role information)
// Wrapped with React cache() to deduplicate within a single server render pass
export const getCurrentUser = cache(async () => {
  const supabaseUser = await getSupabaseUser()

  if (!supabaseUser) {
    return null
  }

  const user = await db.user.findUnique({
    where: { supabase_id: supabaseUser.id, is_active: true },
  })

  return user
})

// Get redirect path based on user role
export function getRoleRedirectPath(role: Role): string {
  switch (role) {
    case 'HOMEOWNER':
      return '/homeowner/dashboard'
    case 'INSPECTOR':
      return '/inspector/dashboard'
    case 'CONTRACTOR':
      return '/contractor/dashboard'
    case 'ADMIN':
      return '/admin/dashboard'
    default:
      return '/login'
  }
}
