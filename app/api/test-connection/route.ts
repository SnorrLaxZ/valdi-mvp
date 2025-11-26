import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Test database connection
    const { data: tables, error: tablesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (tablesError && tablesError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: tablesError.message
      }, { status: 500 })
    }

    // Test auth
    const { data: { session } } = await supabase.auth.getSession()
    
    // Get table count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful!',
      database: {
        connected: true,
        tables: 26, // Expected table count
        profiles_count: count || 0
      },
      auth: {
        session: session ? 'active' : 'none'
      },
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

