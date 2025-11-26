import createMiddleware from 'next-intl/middleware'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { defaultLocale, locales } from './i18n'

const intlMiddleware = createMiddleware(routing)

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Skip locale detection for API routes, static files, and _next
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Run intl middleware first to handle locale routing
  const intlResponse = intlMiddleware(req)
  
  if (!intlResponse) {
    return NextResponse.next()
  }

  // Extract locale from pathname for redirects
  const locale = pathname.split('/')[1] || defaultLocale
  
  // Validate locale
  if (!locales.includes(locale as any)) {
    return intlResponse
  }

  // Now handle auth protection
  const res = intlResponse
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect company routes
  if (pathname.includes('/company')) {
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'company') {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }
  }

  // Protect SDR routes
  if (pathname.includes('/sdr')) {
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'sdr') {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }
  }

  // Protect admin routes
  if (pathname.includes('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/company/:path*',
    '/sdr/:path*',
    '/admin/:path*',
  ],
}