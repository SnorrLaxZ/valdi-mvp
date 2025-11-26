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
    const { review_decision, review_notes, qualification_score, quality_score, call_recording_id } = body

    if (!review_decision || !['approve', 'reject', 'needs_revision'].includes(review_decision)) {
      return NextResponse.json({ error: 'Invalid review decision' }, { status: 400 })
    }

    // Create admin review
    const { data: review, error: reviewError } = await supabase
      .from('admin_reviews')
      .insert({
        meeting_id: meetingId,
        reviewed_by: session.user.id,
        review_decision,
        review_notes: review_notes || null,
        qualification_score: qualification_score || null,
        quality_score: quality_score || null,
        call_recording_id: call_recording_id || null,
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json({ error: reviewError.message }, { status: 500 })
    }

    // Update meeting status based on review decision
    let meetingStatus = 'pending'
    if (review_decision === 'approve') {
      meetingStatus = 'qualified'
    } else if (review_decision === 'reject') {
      meetingStatus = 'not_qualified'
    }

    const { error: updateError } = await supabase
      .from('meetings')
      .update({ status: meetingStatus })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Error updating meeting:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, review })
  } catch (error: any) {
    console.error('Error in review endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

