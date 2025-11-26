import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { callRecordingSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const meetingId = formData.get('meetingId') as string | null
    const campaignId = formData.get('campaignId') as string
    const sdrId = formData.get('sdrId') as string

    if (!file || !campaignId || !sdrId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${sdrId}/${campaignId}/${Date.now()}.${fileExt}`
    const filePath = `call-recordings/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create call recording record
    const { data: recording, error: dbError } = await supabase
      .from('call_recordings')
      .insert({
        meeting_id: meetingId,
        sdr_id: sdrId,
        campaign_id: campaignId,
        storage_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        transcription_status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file on error
      await supabase.storage.from('call-recordings').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create recording record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, recording }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading call:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

