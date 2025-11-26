import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { disputeSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = disputeSchema.parse(body)

    // Create dispute
    const { data: dispute, error } = await supabase
      .from('disputes')
      .insert({
        meeting_id: validated.meeting_id,
        raised_by: session.user.id,
        dispute_type: validated.dispute_type,
        reason: validated.reason,
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating dispute:', error)
      return NextResponse.json(
        { error: 'Failed to create dispute' },
        { status: 500 }
      )
    }

    // Update meeting status to disputed
    await supabase
      .from('meetings')
      .update({ status: 'disputed' })
      .eq('id', validated.meeting_id)

    return NextResponse.json({ success: true, dispute }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

