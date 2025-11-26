/**
 * Dialer Integration Service
 * Handles dialer provider connections and call recording sync
 */

import { supabase } from './supabase'

export type DialerProvider = 'aircall' | 'ringcentral' | 'twilio' | 'justcall' | 'kixie' | 'other'

export interface DialerIntegration {
  id: string
  sdr_id: string
  dialer_provider: DialerProvider
  provider_account_id: string
  provider_phone_number: string | null
  is_active: boolean
  last_sync_at: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

/**
 * Get active dialer integrations for an SDR
 */
export async function getSDRDialerIntegrations(sdrId: string): Promise<DialerIntegration[]> {
  const { data, error } = await supabase
    .from('dialer_integrations')
    .select('*')
    .eq('sdr_id', sdrId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching dialer integrations:', error)
    return []
  }

  return data || []
}

/**
 * Create or update dialer integration
 */
export async function upsertDialerIntegration(
  sdrId: string,
  provider: DialerProvider,
  providerAccountId: string,
  providerPhoneNumber: string | null,
  webhookSecret?: string,
  metadata?: Record<string, any>
): Promise<DialerIntegration | null> {
  const { data, error } = await supabase
    .from('dialer_integrations')
    .upsert(
      {
        sdr_id: sdrId,
        dialer_provider: provider,
        provider_account_id: providerAccountId,
        provider_phone_number: providerPhoneNumber,
        webhook_secret: webhookSecret,
        metadata: metadata || {},
        is_active: true,
        last_sync_at: new Date().toISOString(),
      },
      {
        onConflict: 'sdr_id,dialer_provider,provider_account_id',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting dialer integration:', error)
    return null
  }

  return data
}

/**
 * Deactivate dialer integration
 */
export async function deactivateDialerIntegration(
  integrationId: string,
  sdrId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('dialer_integrations')
    .update({ is_active: false })
    .eq('id', integrationId)
    .eq('sdr_id', sdrId)

  if (error) {
    console.error('Error deactivating integration:', error)
    return false
  }

  return true
}

/**
 * Get webhook URL for a dialer integration
 */
export function getDialerWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.valdi.io'
  return `${baseUrl}/api/webhooks/dialer`
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  if (typeof window === 'undefined') {
    // Server-side
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  } else {
    // Client-side fallback
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Get dialer provider setup instructions
 */
export function getDialerSetupInstructions(provider: DialerProvider): {
  name: string
  webhookUrl: string
  instructions: string[]
  requiredFields: string[]
} {
  const webhookUrl = getDialerWebhookUrl()

  const instructions: Record<DialerProvider, any> = {
    aircall: {
      name: 'Aircall',
      webhookUrl,
      instructions: [
        '1. Go to Aircall Settings > Integrations > Webhooks',
        '2. Click "Add Webhook"',
        `3. Enter webhook URL: ${webhookUrl}`,
        '4. Select events: "call.ended"',
        '5. Copy the webhook secret and paste it below',
        '6. Save your Aircall User ID (found in your profile)',
      ],
      requiredFields: ['User ID', 'Webhook Secret'],
    },
    ringcentral: {
      name: 'RingCentral',
      webhookUrl,
      instructions: [
        '1. Go to RingCentral Developer Portal',
        '2. Create a new webhook subscription',
        `3. Set webhook URL: ${webhookUrl}`,
        '4. Subscribe to events: "CallEnd"',
        '5. Copy the webhook secret',
        '6. Save your RingCentral extension number',
      ],
      requiredFields: ['Extension Number', 'Webhook Secret'],
    },
    twilio: {
      name: 'Twilio',
      webhookUrl,
      instructions: [
        '1. Go to Twilio Console > Phone Numbers',
        '2. Select your outbound number',
        `3. Set Status Callback URL: ${webhookUrl}`,
        '4. Set Status Callback Method: POST',
        '5. Copy your Account SID',
        '6. Generate Auth Token for webhook validation',
      ],
      requiredFields: ['Account SID', 'Auth Token'],
    },
    justcall: {
      name: 'JustCall',
      webhookUrl,
      instructions: [
        '1. Go to JustCall Settings > Integrations > Webhooks',
        `2. Add webhook URL: ${webhookUrl}`,
        '3. Select event: "Call Completed"',
        '4. Copy webhook secret',
        '5. Save your JustCall user ID',
      ],
      requiredFields: ['User ID', 'Webhook Secret'],
    },
    kixie: {
      name: 'Kixie',
      webhookUrl,
      instructions: [
        '1. Go to Kixie Settings > Webhooks',
        `2. Add webhook URL: ${webhookUrl}`,
        '3. Select event: "Call Finished"',
        '4. Copy webhook secret',
        '5. Save your Kixie phone number',
      ],
      requiredFields: ['Phone Number', 'Webhook Secret'],
    },
    other: {
      name: 'Other Dialer',
      webhookUrl,
      instructions: [
        `1. Configure your dialer to send webhooks to: ${webhookUrl}`,
        '2. Ensure webhook includes call recording URL',
        '3. Set webhook secret for security',
        '4. Provide your dialer account identifier',
      ],
      requiredFields: ['Account ID', 'Webhook Secret'],
    },
  }

  return instructions[provider] || instructions.other
}

