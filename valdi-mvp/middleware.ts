import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect company routes
  if (req.nextUrl.pathname.startsWith('/company')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user is actually a company
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'company') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Protect SDR routes
  if (req.nextUrl.pathname.startsWith('/sdr')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user is actually an SDR
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'sdr') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user is actually an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/company/:path*', '/sdr/:path*', '/admin/:path*'],
}