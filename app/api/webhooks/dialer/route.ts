import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

// Initialize Supabase admin client (needs service role key for webhooks)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Supported dialer providers
type DialerProvider = 'aircall' | 'ringcentral' | 'twilio' | 'justcall' | 'kixie' | 'other'

interface DialerWebhookPayload {
  provider: DialerProvider
  event_type: string
  call_id: string
  call_data: {
    id: string
    direction?: 'inbound' | 'outbound'
    from?: string
    to?: string
    duration?: number
    started_at?: string
    ended_at?: string
    recording_url?: string
    recording_id?: string
    status?: string
    user_id?: string
    phone_number?: string
    contact_id?: string
    contact_name?: string
    contact_email?: string
    contact_phone?: string
  }
  signature?: string
  timestamp?: string
}

/**
 * Verify webhook signature (provider-specific)
 */
function verifyWebhookSignature(
  provider: DialerProvider,
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false

  switch (provider) {
    case 'aircall':
      // Aircall uses HMAC SHA256
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(payload)
      const expectedSignature = hmac.digest('hex')
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )

    case 'twilio':
      // Twilio uses HMAC SHA1
      const twilioHmac = crypto.createHmac('sha1', secret)
      twilioHmac.update(payload)
      const twilioExpected = twilioHmac.digest('base64')
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(twilioExpected)
      )

    default:
      // For other providers, use simple secret comparison
      return signature === secret
  }
}

/**
 * Download recording from dialer provider
 */
async function downloadRecording(
  provider: DialerProvider,
  recordingUrl: string,
  accessToken?: string
): Promise<Buffer | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Valdi/1.0',
    }

    // Add provider-specific auth headers
    if (provider === 'aircall' && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    } else if (provider === 'ringcentral' && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(recordingUrl, { headers })
    if (!response.ok) {
      console.error(`Failed to download recording: ${response.statusText}`)
      return null
    }

    return Buffer.from(await response.arrayBuffer())
  } catch (error) {
    console.error('Error downloading recording:', error)
    return null
  }
}

/**
 * Upload recording to Supabase Storage
 */
async function uploadToStorage(
  buffer: Buffer,
  sdrId: string,
  campaignId: string,
  callId: string,
  mimeType: string = 'audio/mpeg'
): Promise<string | null> {
  try {
    const fileName = `${sdrId}/${campaignId}/${callId}-${Date.now()}.mp3`
    const filePath = `call-recordings/${fileName}`

    const { error } = await supabase.storage
      .from('call-recordings')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    return filePath
  } catch (error) {
    console.error('Error uploading to storage:', error)
    return null
  }
}

/**
 * Find or create lead from call data
 */
async function findOrCreateLead(
  campaignId: string,
  companyId: string,
  callData: DialerWebhookPayload['call_data']
): Promise<string | null> {
  // Try to find existing lead by phone/email
  if (callData.contact_phone || callData.contact_email) {
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('campaign_id', campaignId)
      .or(
        callData.contact_phone
          ? `phone.eq.${callData.contact_phone}`
          : `email.eq.${callData.contact_email}`
      )
      .single()

    if (existingLead) {
      return existingLead.id
    }
  }

  // Create new lead if not found
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      campaign_id: campaignId,
      company_id: companyId,
      first_name: callData.contact_name?.split(' ')[0] || null,
      last_name: callData.contact_name?.split(' ').slice(1).join(' ') || null,
      email: callData.contact_email || null,
      phone: callData.contact_phone || callData.to || null,
      status: 'contacted',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating lead:', error)
    return null
  }

  return newLead.id
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const payload: DialerWebhookPayload = JSON.parse(rawBody)

    // Get dialer integration
    const { data: integration, error: integrationError } = await supabase
      .from('dialer_integrations')
      .select('*, sdrs!inner(user_id, id), sdrs!inner(campaign_applications(campaign_id, campaigns!inner(company_id)))')
      .eq('dialer_provider', payload.provider)
      .eq('provider_account_id', payload.call_data.user_id || payload.call_data.phone_number || '')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      console.error('Dialer integration not found:', integrationError)
      return NextResponse.json(
        { error: 'Dialer integration not found' },
        { status: 404 }
      )
    }

    // Verify webhook signature if secret is set
    if (integration.webhook_secret) {
      const signature = request.headers.get('x-signature') || payload.signature
      const isValid = verifyWebhookSignature(
        payload.provider,
        rawBody,
        signature || undefined,
        integration.webhook_secret
      )

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const sdrId = integration.sdr_id
    const sdrData = integration.sdrs as any

    // Only process call.ended events with recordings
    if (payload.event_type !== 'call.ended' || !payload.call_data.recording_url) {
      return NextResponse.json({ success: true, message: 'Event skipped' })
    }

    // Get campaign from SDR's active applications
    const { data: activeApplication } = await supabase
      .from('campaign_applications')
      .select('campaign_id, campaigns!inner(id, company_id)')
      .eq('sdr_id', sdrId)
      .eq('status', 'approved')
      .limit(1)
      .single()

    if (!activeApplication) {
      console.error('No active campaign found for SDR')
      return NextResponse.json(
        { error: 'No active campaign found' },
        { status: 400 }
      )
    }

    const campaignId = activeApplication.campaign_id
    const companyId = (activeApplication.campaigns as any).company_id

    // Download recording
    const recordingBuffer = await downloadRecording(
      payload.provider,
      payload.call_data.recording_url,
      integration.access_token_encrypted || undefined
    )

    if (!recordingBuffer) {
      return NextResponse.json(
        { error: 'Failed to download recording' },
        { status: 500 }
      )
    }

    // Upload to Supabase Storage
    const storagePath = await uploadToStorage(
      recordingBuffer,
      sdrId,
      campaignId,
      payload.call_data.id
    )

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Failed to upload recording' },
        { status: 500 }
      )
    }

    // Find or create lead
    const leadId = await findOrCreateLead(campaignId, companyId, payload.call_data)

    // Create call recording record
    const { data: callRecording, error: recordingError } = await supabase
      .from('call_recordings')
      .insert({
        sdr_id: sdrId,
        campaign_id: campaignId,
        storage_path: storagePath,
        file_name: `${payload.call_data.id}.mp3`,
        file_size: recordingBuffer.length,
        mime_type: 'audio/mpeg',
        duration_seconds: payload.call_data.duration || null,
        transcription_status: 'pending',
        dialer_call_id: payload.call_data.id,
        dialer_integration_id: integration.id,
      })
      .select('id')
      .single()

    if (recordingError) {
      console.error('Error creating call recording:', recordingError)
      return NextResponse.json(
        { error: 'Failed to create recording record' },
        { status: 500 }
      )
    }

    // Create outreach attempt
    if (leadId) {
      await supabase.from('outreach_attempts').insert({
        lead_id: leadId,
        sdr_id: sdrId,
        campaign_id: campaignId,
        attempt_type: 'call',
        attempt_status: payload.call_data.duration && payload.call_data.duration > 0 ? 'connected' : 'no_answer',
        duration_seconds: payload.call_data.duration || null,
        call_recording_id: callRecording.id,
        dialer_call_id: payload.call_data.id,
        dialer_integration_id: integration.id,
        notes: `Auto-imported from ${payload.provider}`,
      })
    }

    // Update integration last_sync_at
    await supabase
      .from('dialer_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      success: true,
      recording_id: callRecording.id,
      message: 'Call recording imported successfully',
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Dialer webhook endpoint is active',
    supported_providers: ['aircall', 'ringcentral', 'twilio', 'justcall', 'kixie'],
  })
}

