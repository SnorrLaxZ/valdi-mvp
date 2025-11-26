import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: recordingId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get call recording
    const { data: recording, error: recordingError } = await supabase
      .from('call_recordings')
      .select('storage_path, meeting_id, campaigns!inner(company_id, companies!inner(user_id))')
      .eq('id', recordingId)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    // Check permissions - user must be admin, company owner, or SDR who uploaded
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'
    const companyUserId = (recording as any).campaigns.companies.user_id
    const isCompanyOwner = companyUserId === session.user.id

    // Check if user is the SDR who uploaded
    const { data: sdr } = await supabase
      .from('sdrs')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single()

    const isSDR = !!sdr

    if (!isAdmin && !isCompanyOwner && !isSDR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get signed URL for the audio file from Supabase Storage
    const { data: urlData, error: urlError } = await supabase.storage
      .from('call-recordings')
      .createSignedUrl(recording.storage_path, 3600) // 1 hour expiry

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate audio URL' }, { status: 500 })
    }

    // Redirect to the signed URL
    return NextResponse.redirect(urlData.signedUrl)
  } catch (error: any) {
    console.error('Error in audio endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

