import { supabase } from './supabase'

const CALL_RECORDINGS_BUCKET = 'call-recordings'

export async function uploadCallRecording(
  file: File,
  meetingId: string | null,
  sdrId: string,
  campaignId: string
): Promise<{ path: string; url: string } | null> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${sdrId}/${campaignId}/${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(CALL_RECORDINGS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading file:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CALL_RECORDINGS_BUCKET)
      .getPublicUrl(filePath)

    return {
      path: filePath,
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('Error in uploadCallRecording:', error)
    return null
  }
}

export async function deleteCallRecording(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(CALL_RECORDINGS_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('Error deleting file:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteCallRecording:', error)
    return false
  }
}

export function getCallRecordingUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(CALL_RECORDINGS_BUCKET)
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function ensureCallRecordingsBucket(): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('Error listing buckets:', listError)
      return false
    }

    const bucketExists = buckets?.some(bucket => bucket.name === CALL_RECORDINGS_BUCKET)

    if (!bucketExists) {
      // Create bucket (requires admin privileges)
      const { error: createError } = await supabase.storage.createBucket(CALL_RECORDINGS_BUCKET, {
        public: false,
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'video/mp4'],
      })

      if (createError) {
        console.error('Error creating bucket:', createError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in ensureCallRecordingsBucket:', error)
    return false
  }
}

