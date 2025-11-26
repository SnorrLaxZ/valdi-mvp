/**
 * Twilio Integration Service
 * Handles voice calls, Media Streams, and phone number management
 */

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
const authToken = process.env.TWILIO_AUTH_TOKEN || ''
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || ''

let client: ReturnType<typeof twilio> | null = null

if (accountSid && authToken) {
  client = twilio(accountSid, authToken)
} else {
  console.warn('Twilio credentials not configured - Twilio features disabled')
}

export interface TwilioCallConfig {
  sdrId: string
  campaignId: string
  leadId?: string
  to: string // Phone number to call
  from?: string // Twilio phone number (defaults to env var)
  mediaStreamUrl?: string // WebSocket URL for Media Streams
}

/**
 * Initiate outbound call via Twilio
 */
export async function initiateCall(config: TwilioCallConfig): Promise<string> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    const call = await client.calls.create({
      to: config.to,
      from: config.from || twilioPhoneNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/outbound`,
      method: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true, // Record call for backup
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/recording`,
      recordingStatusCallbackMethod: 'POST',
      // Note: Media Streams are configured via TwiML, not call options
    } as any)

    return call.sid
  } catch (error: any) {
    console.error('Error initiating Twilio call:', error)
    throw new Error(`Failed to initiate call: ${error.message}`)
  }
}

/**
 * Get available phone numbers in Sweden
 */
export async function getSwedishPhoneNumbers(): Promise<any[]> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    const numbers = await client.availablePhoneNumbers('SE')
      .local
      .list({
        limit: 20,
        smsEnabled: true,
        voiceEnabled: true,
      })

    return numbers.map(num => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      region: num.region,
      locality: num.locality,
    }))
  } catch (error: any) {
    console.error('Error fetching Swedish numbers:', error)
    return []
  }
}

/**
 * Purchase phone number for SDR
 */
export async function purchasePhoneNumber(phoneNumber: string): Promise<boolean> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
      phoneNumber,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/inbound`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
      statusCallbackMethod: 'POST',
    })

    return !!incomingPhoneNumber.sid
  } catch (error: any) {
    console.error('Error purchasing phone number:', error)
    return false
  }
}

/**
 * Release phone number
 */
export async function releasePhoneNumber(phoneNumberSid: string): Promise<boolean> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    await client.incomingPhoneNumbers(phoneNumberSid).remove()
    return true
  } catch (error: any) {
    console.error('Error releasing phone number:', error)
    return false
  }
}

/**
 * Get call details
 */
export async function getCallDetails(callSid: string): Promise<any> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    const call = await client.calls(callSid).fetch()
    return {
      sid: call.sid,
      status: call.status,
      from: call.from,
      to: call.to,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      price: call.price,
      priceUnit: call.priceUnit,
    }
  } catch (error: any) {
    console.error('Error fetching call details:', error)
    return null
  }
}

/**
 * End call
 */
export async function endCall(callSid: string): Promise<boolean> {
  if (!client) {
    throw new Error('Twilio client not initialized - credentials required')
  }
  
  try {
    await client.calls(callSid).update({ status: 'completed' })
    return true
  } catch (error: any) {
    console.error('Error ending call:', error)
    return false
  }
}

/**
 * Generate TwiML for outbound call
 */
export function generateOutboundTwiML(mediaStreamUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${mediaStreamUrl}" />
  </Start>
  <Say voice="alice" language="sv-SE">
    Connecting your call...
  </Say>
  <Dial>
    <Number>+46XXXXXXXXX</Number>
  </Dial>
</Response>`
}

/**
 * Generate TwiML for inbound call
 */
export function generateInboundTwiML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="sv-SE">
    Thank you for calling. Please hold while we connect you.
  </Say>
</Response>`
}

