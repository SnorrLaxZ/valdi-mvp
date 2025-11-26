import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: disputeId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { resolution, status } = body

    if (!resolution || !status || !['resolved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid resolution data' }, { status: 400 })
    }

    // Update dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .update({
        status,
        resolution,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single()

    if (disputeError) {
      console.error('Error resolving dispute:', disputeError)
      return NextResponse.json({ error: disputeError.message }, { status: 500 })
    }

    // If resolved in favor of SDR, update meeting status
    if (status === 'resolved' && dispute.meeting_id) {
      // You might want to add logic here to determine if meeting should be qualified
      // For now, we'll just mark it as resolved
    }

    return NextResponse.json({ success: true, dispute })
  } catch (error: any) {
    console.error('Error in resolve dispute endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

