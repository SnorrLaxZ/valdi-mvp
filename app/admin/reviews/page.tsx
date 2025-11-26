'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AudioPlayer, CallTranscript, QualificationChecklist } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { Meeting, CallRecording, AIScore } from '@/lib/supabase'

interface MeetingWithDetails extends Meeting {
  call_recording?: CallRecording
  ai_scores?: AIScore[]
  campaigns?: {
    title: string
    commission_per_meeting: number
  }
  sdrs?: {
    user_id: string
  }
}

export default function ReviewQueuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null)
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | 'needs_revision'>('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [qualificationScore, setQualificationScore] = useState(80)
  const [qualityScore, setQualityScore] = useState(80)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPendingMeetings()
  }, [])

  const loadPendingMeetings = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Load pending meetings with related data
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select(`
          *,
          campaigns (title, commission_per_meeting),
          sdrs (user_id)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!meetingsData) return

      // Load call recordings and AI scores for each meeting
      const meetingsWithDetails = await Promise.all(
        meetingsData.map(async (meeting) => {
          const { data: recording } = await supabase
            .from('call_recordings')
            .select('*')
            .eq('meeting_id', meeting.id)
            .single()

          const { data: aiScores } = await supabase
            .from('ai_scores')
            .select('*')
            .eq('meeting_id', meeting.id)
            .order('created_at', { ascending: false })

          return {
            ...meeting,
            call_recording: recording || undefined,
            ai_scores: aiScores || [],
            campaigns: (meeting as any).campaigns,
            sdrs: (meeting as any).sdrs,
          } as MeetingWithDetails
        })
      )

      setMeetings(meetingsWithDetails)
      if (meetingsWithDetails.length > 0 && !selectedMeeting) {
        setSelectedMeeting(meetingsWithDetails[0])
      }
    } catch (error) {
      console.error('Error loading meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedMeeting) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/meetings/${selectedMeeting.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_decision: reviewDecision,
          review_notes: reviewNotes,
          qualification_score: qualificationScore,
          quality_score: qualityScore,
          call_recording_id: selectedMeeting.call_recording?.id || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      await loadPendingMeetings()
      setReviewNotes('')
      setQualificationScore(80)
      setQualityScore(80)
      setReviewDecision('approve')
      
      // Select next meeting
      const currentIndex = meetings.findIndex(m => m.id === selectedMeeting.id)
      if (currentIndex < meetings.length - 1) {
        setSelectedMeeting(meetings[currentIndex + 1])
      } else if (meetings.length > 1) {
        setSelectedMeeting(meetings[0])
      } else {
        setSelectedMeeting(null)
      }

      alert('Review submitted successfully')
    } catch (error: any) {
      console.error('Error submitting review:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const getQualificationCriteria = (meetingCriteria: string | string[]): string[] => {
    if (Array.isArray(meetingCriteria)) {
      return meetingCriteria
    }
    try {
      return JSON.parse(meetingCriteria)
    } catch {
      return [meetingCriteria]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Laddar...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meetings.length} meeting(s) pending review
          </p>
        </div>

        {meetings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-sm text-gray-400">No pending meetings to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meetings List */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Pending Reviews</h2>
                </div>
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                        selectedMeeting?.id === meeting.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{meeting.contact_name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {meeting.campaigns?.title || 'Unknown Campaign'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(meeting.meeting_date).toLocaleDateString('sv-SE')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Panel */}
            {selectedMeeting && (
              <div className="lg:col-span-2 space-y-6">
                {/* Meeting Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedMeeting.contact_name}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedMeeting.campaigns?.title} • €{selectedMeeting.campaigns?.commission_per_meeting}
                      </p>
                    </div>
                    <Link
                      href={`/admin/meetings/${selectedMeeting.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      View Full Details →
                    </Link>
                  </div>
                </div>

                {/* Call Recording */}
                {selectedMeeting.call_recording && (
                  <AudioPlayer
                    src={`/api/audio/${selectedMeeting.call_recording.id}`}
                    title="Call Recording"
                  />
                )}

                {/* Transcript */}
                {selectedMeeting.call_recording?.transcription && (
                  <CallTranscript
                    transcript={selectedMeeting.call_recording.transcription}
                    aiHighlights={selectedMeeting.ai_scores?.map(score => ({
                      start: 0,
                      end: 0,
                      type: score.score_type === 'qualification_match' ? 'qualification' : 'issue',
                      text: score.score_details?.summary || '',
                    })) || []}
                  />
                )}

                {/* AI Scores */}
                {selectedMeeting.ai_scores && selectedMeeting.ai_scores.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">AI Scores</h3>
                    <div className="space-y-3">
                      {selectedMeeting.ai_scores.map((score) => (
                        <div key={score.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {score.score_type.replace('_', ' ')}
                            </span>
                            <span className={`text-sm font-semibold ${
                              score.score_value >= 80 ? 'text-green-600' :
                              score.score_value >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {score.score_value}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualification Checklist */}
                {selectedMeeting.campaigns && (
                  <QualificationChecklist
                    criteria={getQualificationCriteria(selectedMeeting.meeting_criteria || '[]')}
                    checklist={(selectedMeeting.qualification_checklist as boolean[]) || []}
                    readOnly={true}
                  />
                )}

                {/* SDR Notes */}
                {selectedMeeting.notes && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">SDR Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMeeting.notes}</p>
                  </div>
                )}

                {/* Review Form */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Review Decision</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Decision</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setReviewDecision('approve')}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                            reviewDecision === 'approve'
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Approve</span>
                        </button>
                        <button
                          onClick={() => setReviewDecision('needs_revision')}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                            reviewDecision === 'needs_revision'
                              ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Needs Revision</span>
                        </button>
                        <button
                          onClick={() => setReviewDecision('reject')}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                            reviewDecision === 'reject'
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <XCircle className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Reject</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Qualification Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={qualificationScore}
                          onChange={(e) => setQualificationScore(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Quality Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={qualityScore}
                          onChange={(e) => setQualityScore(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Review Notes
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Add your review notes..."
                      />
                    </div>

                    <Button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

