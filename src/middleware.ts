import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromToken } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/api/']
const PROTECTED_PREFIXES = ['/(terminal)', '/(backoffice)']

function isProtected(pathname: string): boolean {
  // Allow storefront, API, and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/(storefront)') ||
    pathname.startsWith('/menu') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return false
  }

  // Allow login page
  if (pathname === '/login' || pathname.endsWith('/login')) {
    return false
  }

  // Protect terminal and backoffice routes
  for (const prefix of PROTECTED_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }

  // Also protect non-grouped terminal/backoffice paths
  if (
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/returns') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/settings')
  ) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('oasis-session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await getSessionFromToken(token)
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('oasis-session', '', { maxAge: 0 })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
