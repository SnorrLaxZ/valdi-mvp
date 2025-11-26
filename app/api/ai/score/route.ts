import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
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
    const { call_recording_id, meeting_id, sdr_id, score_type, score_value, score_details } = body

    // Create AI score record
    const { data: score, error } = await supabase
      .from('ai_scores')
      .insert({
        call_recording_id: call_recording_id || null,
        meeting_id: meeting_id || null,
        sdr_id,
        score_type,
        score_value,
        score_details: score_details || null,
        ai_model: 'valdi-ai-v1', // Placeholder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating AI score:', error)
      return NextResponse.json(
        { error: 'Failed to create AI score' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, score }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating AI score:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

