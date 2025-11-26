import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { Meeting, CallRecording, AIScore, AdminReview } from '../supabase'

export interface MeetingDetails extends Meeting {
  call_recording?: CallRecording
  ai_scores?: AIScore[]
  admin_reviews?: AdminReview[]
  campaign?: {
    id: string
    title: string
    commission_per_meeting: number
    meeting_criteria?: string | string[]
  }
  sdr?: {
    id: string
    user_id: string
  }
}

export function useMeeting(meetingId: string | null) {
  const [meeting, setMeeting] = useState<MeetingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!meetingId) {
      setLoading(false)
      return
    }

    loadMeeting()
  }, [meetingId])

  const loadMeeting = async () => {
    if (!meetingId) return

    try {
      setLoading(true)
      setError(null)

      // Load meeting with related data
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          campaigns (id, title, commission_per_meeting),
          sdrs (id, user_id)
        `)
        .eq('id', meetingId)
        .single()

      if (meetingError) throw meetingError

      // Load call recording
      const { data: recordingData } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('meeting_id', meetingId)
        .single()

      // Load AI scores
      const { data: aiScoresData } = await supabase
        .from('ai_scores')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })

      // Load admin reviews
      const { data: reviewsData } = await supabase
        .from('admin_reviews')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })

      setMeeting({
        ...meetingData,
        call_recording: recordingData || undefined,
        ai_scores: aiScoresData || [],
        admin_reviews: reviewsData || [],
        campaign: (meetingData as any).campaigns,
        sdr: (meetingData as any).sdrs,
      } as MeetingDetails)
    } catch (err: any) {
      console.error('Error loading meeting:', err)
      setError(err.message || 'Failed to load meeting')
    } finally {
      setLoading(false)
    }
  }

  return { meeting, loading, error, refetch: loadMeeting }
}

