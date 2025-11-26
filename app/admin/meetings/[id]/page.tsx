'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useMeeting } from '@/lib/hooks/useMeeting'
import { AudioPlayer, CallTranscript, QualificationChecklist, MeetingTimeline } from '@/components/shared'
import { Button } from '@/components/ui/button'

export default function AdminMeetingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const meetingId = params.id as string
  const { meeting, loading, error } = useMeeting(meetingId)

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

  const buildTimelineEvents = () => {
    if (!meeting) return []

    const events = []

    // SDR submission
    events.push({
      id: 'sdr-submission',
      timestamp: meeting.created_at,
      actor: 'sdr' as const,
      action: 'Submitted meeting',
      details: meeting.notes || undefined,
    })

    // AI scoring
    if (meeting.ai_scores && meeting.ai_scores.length > 0) {
      meeting.ai_scores.forEach((score, index) => {
        events.push({
          id: `ai-score-${index}`,
          timestamp: score.created_at,
          actor: 'ai' as const,
          action: `AI Score: ${score.score_type.replace('_', ' ')} - ${score.score_value}%`,
          details: score.score_details ? JSON.stringify(score.score_details) : undefined,
        })
      })
    }

    // Admin reviews
    if (meeting.admin_reviews && meeting.admin_reviews.length > 0) {
      meeting.admin_reviews.forEach((review, index) => {
        events.push({
          id: `admin-review-${index}`,
          timestamp: review.created_at,
          actor: 'admin' as const,
          action: `Admin Review: ${review.review_decision}`,
          details: review.review_notes || undefined,
          status: review.review_decision === 'approve' ? 'approved' :
                  review.review_decision === 'reject' ? 'rejected' :
                  'needs_revision',
        })
      })
    }

    // Client decision
    if (meeting.status !== 'pending') {
      events.push({
        id: 'client-decision',
        timestamp: meeting.updated_at,
        actor: 'client' as const,
        action: `Client Decision: ${meeting.status}`,
        details: meeting.rejection_reason || undefined,
        status: meeting.status === 'qualified' ? 'approved' : 'rejected',
      })
    }

    return events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
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

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-400">Error loading meeting</div>
        </div>
      </div>
    )
  }

  const criteria = meeting.campaign ? getQualificationCriteria(meeting.campaign.meeting_criteria || '[]') : []
  const checklist = meeting.qualification_checklist as boolean[] || new Array(criteria.length).fill(false)
  const audioUrl = meeting.call_recording ? `/api/audio/${meeting.call_recording.id}` : null
  const timelineEvents = buildTimelineEvents()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{meeting.contact_name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Meeting Detail • Full Timeline
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/reviews">
                <Button variant="outline">Back to Review Queue</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <MeetingTimeline events={timelineEvents} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Call Recording */}
            {audioUrl && meeting.call_recording && (
              <AudioPlayer
                src={audioUrl}
                title="Call Recording"
              />
            )}

            {/* Call Transcript */}
            {meeting.call_recording?.transcription && (
              <CallTranscript
                transcript={meeting.call_recording.transcription}
                aiHighlights={meeting.ai_scores?.map(score => ({
                  start: 0,
                  end: 0,
                  type: score.score_type === 'qualification_match' ? 'qualification' : 'issue',
                  text: score.score_details?.summary || '',
                })) || []}
              />
            )}

            {/* SDR Notes */}
            {meeting.notes && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">SDR Notes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Meeting Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Contact Name</label>
                  <p className="text-sm text-gray-900 mt-1">{meeting.contact_name}</p>
                </div>
                {meeting.contact_email && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{meeting.contact_email}</p>
                  </div>
                )}
                {meeting.contact_phone && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{meeting.contact_phone}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Meeting Date</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(meeting.meeting_date).toLocaleString('sv-SE')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p className="text-sm text-gray-900 mt-1">{meeting.status}</p>
                </div>
                {meeting.campaign && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Campaign</label>
                    <p className="text-sm text-gray-900 mt-1">{meeting.campaign.title}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Scores */}
            {meeting.ai_scores && meeting.ai_scores.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">AI Scores</h2>
                <div className="space-y-3">
                  {meeting.ai_scores.map((score) => (
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
                      {score.score_details && (
                        <pre className="text-xs text-gray-600 mt-2 overflow-auto">
                          {JSON.stringify(score.score_details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualification Checklist */}
            {criteria.length > 0 && (
              <QualificationChecklist
                criteria={criteria}
                checklist={checklist}
                readOnly={true}
              />
            )}

            {/* Admin Reviews */}
            {meeting.admin_reviews && meeting.admin_reviews.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Reviews</h2>
                <div className="space-y-3">
                  {meeting.admin_reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {review.review_decision.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleString('sv-SE')}
                        </span>
                      </div>
                      {review.review_notes && (
                        <p className="text-sm text-gray-600 mt-1">{review.review_notes}</p>
                      )}
                      {(review.qualification_score || review.quality_score) && (
                        <div className="text-xs text-gray-500 mt-2">
                          Qualification: {review.qualification_score || 'N/A'} • 
                          Quality: {review.quality_score || 'N/A'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


