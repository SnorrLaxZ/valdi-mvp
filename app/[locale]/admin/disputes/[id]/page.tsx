'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { AudioPlayer, CallTranscript } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Dispute, Meeting } from '@/lib/supabase'

interface DisputeWithMeeting extends Dispute {
  meetings: Meeting & {
    call_recording?: any
    ai_scores?: any[]
  }
}

export default function DisputeResolutionPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()
  const disputeId = params.id as string
  const [loading, setLoading] = useState(true)
  const [dispute, setDispute] = useState<DisputeWithMeeting | null>(null)
  const [resolution, setResolution] = useState('')
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDispute()
  }, [disputeId])

  const loadDispute = async () => {
    try {
      setLoading(true)
      const { data: disputeData } = await supabase
        .from('disputes')
        .select(`
          *,
          meetings (
            *,
            call_recordings (*),
            ai_scores (*)
          )
        `)
        .eq('id', disputeId)
        .single()

      if (disputeData) {
        setDispute(disputeData as any)
      }
    } catch (error) {
      console.error('Error loading dispute:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!resolution.trim()) {
      alert('Please provide a resolution')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          status: resolutionStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve dispute')
      }

      await loadDispute()
      alert('Dispute resolved successfully')
    } catch (error: any) {
      console.error('Error resolving dispute:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
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

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-400">Dispute not found</div>
        </div>
      </div>
    )
  }

  const meeting = dispute.meetings as any
  const audioUrl = meeting?.call_recordings?.[0] ? `/api/audio/${meeting.call_recordings[0].id}` : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
              <p className="text-sm text-gray-500 mt-1">
                {dispute.dispute_type} dispute • {dispute.status}
              </p>
            </div>
            <Link href="/admin/disputes">
              <Button variant="outline">Back to Disputes</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Evidence */}
          <div className="space-y-6">
            {/* Dispute Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Dispute Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{dispute.dispute_type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Reason</label>
                  <p className="text-sm text-gray-900 mt-1">{dispute.reason}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p className="text-sm text-gray-900 mt-1">{dispute.status}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(dispute.created_at).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                  </p>
                </div>
              </div>
            </div>

            {/* Meeting Info */}
            {meeting && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Information</h2>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Contact:</span> {meeting.contact_name}
                  </p>
                  {meeting.contact_email && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Email:</span> {meeting.contact_email}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(meeting.meeting_date).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Status:</span> {meeting.status}
                  </p>
                </div>
              </div>
            )}

            {/* Call Recording */}
            {audioUrl && (
              <AudioPlayer
                src={audioUrl}
                title={t('common.callRecording')}
              />
            )}

            {/* Transcript */}
            {meeting?.call_recordings?.[0]?.transcription && (
              <CallTranscript
                transcript={meeting.call_recordings[0].transcription}
              />
            )}

            {/* SDR Notes */}
            {meeting?.notes && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">SDR Notes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}

            {/* AI Scores */}
            {meeting?.ai_scores && meeting.ai_scores.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">AI Scores</h2>
                <div className="space-y-2">
                  {meeting.ai_scores.map((score: any) => (
                    <div key={score.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
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
          </div>

          {/* Right Column - Resolution */}
          <div className="space-y-6">
            {/* Resolution Form */}
            {dispute.status === 'open' || dispute.status === 'under_review' ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Resolution</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution Status</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setResolutionStatus('resolved')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          resolutionStatus === 'resolved'
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Resolve</span>
                      </button>
                      <button
                        onClick={() => setResolutionStatus('rejected')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          resolutionStatus === 'rejected'
                            ? 'border-red-600 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <XCircle className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Reject</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Resolution Notes
                    </label>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={8}
                      placeholder="Provide detailed resolution notes..."
                    />
                  </div>

                  <Button
                    onClick={handleResolve}
                    disabled={submitting || !resolution.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Submitting...' : 'Submit Resolution'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Resolution</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                    <p className="text-sm text-gray-900 mt-1 capitalize">{dispute.status}</p>
                  </div>
                  {dispute.resolution && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Resolution</label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {dispute.resolution}
                      </p>
                    </div>
                  )}
                  {dispute.resolved_at && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Resolved At</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(dispute.resolved_at).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


