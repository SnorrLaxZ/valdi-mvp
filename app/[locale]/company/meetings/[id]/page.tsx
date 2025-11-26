'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useMeeting } from '@/lib/hooks/useMeeting'
import { SidebarLayout } from '@/components/layouts/SidebarLayout'
import { AudioPlayer, CallTranscript, QualificationChecklist } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function MeetingReviewPage() {
  const router = useRouter()
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations()
  const meetingId = params.id as string
  const { meeting, loading, error, refetch } = useMeeting(meetingId)
  const [companyName, setCompanyName] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCompanyName()
  }, [])

  const loadCompanyName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('user_id', user.id)
        .single()

      if (company) setCompanyName(company.company_name)
    } catch (error) {
      console.error('Error loading company:', error)
    }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve meeting')
      }

      await refetch()
      alert(t('meeting.review.approveSuccess'))
    } catch (error: any) {
      console.error('Error approving meeting:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          rejection_reason: rejectionReason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject meeting')
      }

      await refetch()
      setShowRejectForm(false)
      setRejectionReason('')
      alert(t('meeting.review.rejectSuccess'))
    } catch (error: any) {
      console.error('Error rejecting meeting:', error)
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

  const navItems = [
    { href: '/company/dashboard', label: 'Dashboard' },
    { href: '/company/campaigns', label: 'Kampanjer' },
    { href: '/company/meetings', label: 'Möten' },
    { href: '/company/disputes', label: 'Disputes' },
    { href: '/company/leads', label: 'Leads' },
  ]

  if (loading) {
    return (
      <SidebarLayout
        title={t('common.meetingReview')}
        subtitle={companyName}
        navItems={navItems}
        activePath="/company/meetings"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">{t('common.loading')}</div>
        </div>
      </SidebarLayout>
    )
  }

  if (error || !meeting) {
    return (
      <SidebarLayout
        title={t('common.meetingReview')}
        subtitle={companyName}
        navItems={navItems}
        activePath="/company/meetings"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-400">{t('common.errorLoading', { resource: t('common.meeting') })}</div>
        </div>
      </SidebarLayout>
    )
  }

  const criteria = meeting.campaign && 'meeting_criteria' in meeting.campaign 
    ? getQualificationCriteria((meeting.campaign as any).meeting_criteria || '[]') 
    : []
  const checklist = meeting.qualification_checklist as boolean[] || new Array(criteria.length).fill(false)
  const audioUrl = meeting.call_recording ? `/api/audio/${meeting.call_recording.id}` : null

  return (
    <SidebarLayout
      title={t('common.meetingReview')}
      subtitle={companyName}
      navItems={navItems}
      activePath="/company/meetings"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{meeting.contact_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('meeting.scheduled')} {new Date(meeting.meeting_date).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              meeting.status === 'qualified' ? 'bg-green-100 text-green-700' :
              meeting.status === 'not_qualified' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {meeting.status}
            </span>
            <Link
              href="/company/meetings"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Back to Meetings
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Call Recording */}
          {audioUrl && meeting.call_recording && (
            <AudioPlayer
              src={audioUrl}
              title={t('common.callRecording')}
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
                  {new Date(meeting.meeting_date).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                </p>
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
                      <p className="text-xs text-gray-600 mt-1">
                        {JSON.stringify(score.score_details, null, 2)}
                      </p>
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Review</h2>
              {meeting.admin_reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {review.review_decision === 'approve' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {review.review_decision === 'reject' && <XCircle className="h-4 w-4 text-red-600" />}
                    {review.review_decision === 'needs_revision' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {review.review_decision.replace('_', ' ')}
                    </span>
                  </div>
                  {review.review_notes && (
                    <p className="text-sm text-gray-600">{review.review_notes}</p>
                  )}
                  {review.qualification_score && (
                    <p className="text-xs text-gray-500 mt-2">
                      Qualification Score: {review.qualification_score}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Approval Actions */}
          {meeting.status === 'pending' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Review Decision</h2>
              
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Meeting
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Meeting
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleReject}
                      disabled={submitting || !rejectionReason.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      Confirm Rejection
                    </Button>
                    <Button
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectionReason('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rejection Reason Display */}
          {meeting.status === 'not_qualified' && meeting.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-900 mb-2">{t('common.rejectionReason')}</h3>
              <p className="text-sm text-red-700">{meeting.rejection_reason}</p>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}

