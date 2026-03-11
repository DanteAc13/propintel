import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function rateLimitResponse(resetMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) },
    }
  )
}

// Routes that require authentication — redirect to /login if no session
const PROTECTED_PATH_PREFIXES = [
  '/inspector',
  '/homeowner',
  '/contractor',
  '/admin',
]

// API routes that require authentication — return 401 JSON if no session
const PROTECTED_API_PREFIXES = [
  '/api/inspections',
  '/api/observations',
  '/api/media',
  '/api/projects',
  '/api/properties',
  '/api/scope-items',
  '/api/sections',
  '/api/contractor',
  '/api/admin',
  '/api/ai',
]

// Routes that are always accessible without authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/',
]

function isPublicRoute(pathname: string): boolean {
  // Exact match for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }

  return false
}

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and supabase.auth.getUser().
  // A simple mistake here can lead to difficult-to-debug session refresh issues.

  // Refreshes the session if expired — required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const method = request.method

  // --- Rate limiting ---
  const ip = getClientIp(request)

  // Auth actions (login/signup server actions): limit by IP
  if (method === 'POST' && (pathname === '/login' || pathname === '/signup')) {
    const result = rateLimit(`auth:${ip}`, RATE_LIMITS.auth)
    if (!result.allowed) return rateLimitResponse(result.resetMs)
  }

  // Media upload: limit by IP (user ID not available here yet)
  if (method === 'POST' && pathname === '/api/media/upload') {
    const result = rateLimit(`upload:${ip}`, RATE_LIMITS.upload)
    if (!result.allowed) return rateLimitResponse(result.resetMs)
  }

  // AI endpoints: limit by IP
  if (pathname.startsWith('/api/ai/')) {
    const result = rateLimit(`ai:${ip}`, RATE_LIMITS.ai)
    if (!result.allowed) return rateLimitResponse(result.resetMs)
  }

  // Allow public routes through without auth check
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Protected API routes — return 401 JSON for unauthenticated requests
  if (isProtectedApi(pathname) && !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Protected page routes — redirect to /login if not authenticated
  if (isProtectedPage(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
