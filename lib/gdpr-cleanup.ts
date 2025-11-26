/**
 * GDPR Compliance - Call Recording Cleanup
 * Automatically deletes call recordings after 30 days
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Delete expired call recordings (30 days old)
 * Should be run daily via cron job or scheduled task
 */
export async function cleanupExpiredRecordings(): Promise<{
  deleted: number
  errors: number
}> {
  let deleted = 0
  let errors = 0

  try {
    // Find recordings that should be deleted (30 days old)
    const { data: expiredRecordings, error: fetchError } = await supabase
      .from('call_recordings')
      .select('id, storage_path')
      .not('auto_deleted_at', 'is', null)
      .lte('auto_deleted_at', new Date().toISOString())
      .not('storage_path', 'is', null)

    if (fetchError) {
      console.error('Error fetching expired recordings:', fetchError)
      return { deleted: 0, errors: 1 }
    }

    if (!expiredRecordings || expiredRecordings.length === 0) {
      return { deleted: 0, errors: 0 }
    }

    // Delete files from storage
    const filePaths = expiredRecordings
      .map((r) => r.storage_path)
      .filter((p): p is string => p !== null)

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('call-recordings')
        .remove(filePaths)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
        errors += filePaths.length
      } else {
        deleted += filePaths.length
      }
    }

    // Mark recordings as deleted in database (keep metadata for audit)
    const { error: updateError } = await supabase
      .from('call_recordings')
      .update({
        storage_path: null,
        file_name: '[DELETED - GDPR Compliance]',
        transcription: null,
      })
      .in(
        'id',
        expiredRecordings.map((r) => r.id)
      )

    if (updateError) {
      console.error('Error updating recording records:', updateError)
      errors += expiredRecordings.length
    }

    console.log(`GDPR Cleanup: Deleted ${deleted} recordings, ${errors} errors`)

    return { deleted, errors }
  } catch (error) {
    console.error('Error in cleanupExpiredRecordings:', error)
    return { deleted: 0, errors: 1 }
  }
}

/**
 * Get statistics about recordings approaching expiration
 */
export async function getRecordingExpirationStats(): Promise<{
  total: number
  expiring_soon: number // Expiring in next 7 days
  expired: number
}> {
  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data: allRecordings } = await supabase
      .from('call_recordings')
      .select('auto_deleted_at')
      .not('storage_path', 'is', null)

    const { data: expiringSoon } = await supabase
      .from('call_recordings')
      .select('id')
      .not('auto_deleted_at', 'is', null)
      .gte('auto_deleted_at', now.toISOString())
      .lte('auto_deleted_at', sevenDaysFromNow.toISOString())
      .not('storage_path', 'is', null)

    const { data: expired } = await supabase
      .from('call_recordings')
      .select('id')
      .not('auto_deleted_at', 'is', null)
      .lte('auto_deleted_at', now.toISOString())
      .not('storage_path', 'is', null)

    return {
      total: allRecordings?.length || 0,
      expiring_soon: expiringSoon?.length || 0,
      expired: expired?.length || 0,
    }
  } catch (error) {
    console.error('Error getting expiration stats:', error)
    return { total: 0, expiring_soon: 0, expired: 0 }
  }
}

