// src/lib/api-auth.ts
// Shared API route authentication helper.
// Every protected API route should call this at the top of its handler.
//
// Usage:
//   const auth = await authenticateRequest(['INSPECTOR', 'ADMIN'])
//   if (!auth.user) return auth.response
//   // auth.user is typed as User

import { getCurrentUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { User, Role } from '@prisma/client'

type AuthSuccess = { user: User }
type AuthFailure = { user: null; response: NextResponse }
type AuthResult = AuthSuccess | AuthFailure

/**
 * Authenticate the current request and optionally check role.
 *
 * @param allowedRoles - If provided, restricts access to these roles. Omit to allow any authenticated user.
 * @returns The authenticated user, or a pre-built error response (401 or 403).
 */
export async function authenticateRequest(
  allowedRoles?: Role[]
): Promise<AuthResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: `Insufficient permissions: ${allowedRoles.join(' or ')} role required` },
        { status: 403 }
      ),
    }
  }

  return { user }
}
