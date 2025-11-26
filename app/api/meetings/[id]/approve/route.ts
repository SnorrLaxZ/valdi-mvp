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
    const { id: meetingId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is company
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'company') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify company owns this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        *,
        campaigns!inner (
          company_id,
          companies!inner (user_id)
        )
      `)
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const companyId = (meeting as any).campaigns.company_id
    const { data: company } = await supabase
      .from('companies')
      .select('user_id')
      .eq('id', companyId)
      .single()

    if (company?.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { approved, rejection_reason } = body

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid approval status' }, { status: 400 })
    }

    const updateData: any = {
      status: approved ? 'qualified' : 'not_qualified',
    }

    if (!approved && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { error: updateError } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId)

    if (updateError) {
      console.error('Error updating meeting:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in approve endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

