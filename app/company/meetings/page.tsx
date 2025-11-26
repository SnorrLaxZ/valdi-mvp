'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Meeting, Campaign } from '@/lib/supabase'

interface MeetingWithCampaign extends Meeting {
  campaign: Campaign
}

export default function CompanyMeetingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<MeetingWithCampaign[]>([])
  const [companyName, setCompanyName] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'qualified' | 'not_qualified'>('all')
  const [rejectingMeetingId, setRejectingMeetingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!company) return
      setCompanyName(company.company_name)

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('company_id', company.id)

      if (!campaigns) return

      const campaignIds = campaigns.map(c => c.id)

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select(`
          *,
          campaigns (*)
        `)
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })

      const typedMeetings = (meetingsData as any[])?.map(m => ({
        ...m,
        campaign: m.campaigns
      })) as MeetingWithCampaign[]

      setMeetings(typedMeetings || [])
    } catch (error) {
      console.error('Error loading meetings:', error)
    } finally {
      setLoading(false)
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

  const updateMeetingStatus = async (meetingId: string, newStatus: 'qualified' | 'not_qualified', reason?: string) => {
    console.log('Updating meeting:', meetingId, 'to status:', newStatus, 'reason:', reason)
    
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'not_qualified' && reason) {
        updateData.rejection_reason = reason
      }

      console.log('Update data:', updateData)

      const { data, error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId)
        .select()

      console.log('Update result:', { data, error })

      if (error) throw error

      setRejectingMeetingId(null)
      setRejectionReason('')

      await loadMeetings()
      
      console.log('Meeting updated successfully!')
    } catch (error) {
      console.error('Error updating meeting:', error)
      alert(`Kunde inte uppdatera mötet: ${error}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredMeetings = meetings.filter(meeting => {
    if (filter === 'all') return true
    return meeting.status === filter
  })

  const stats = {
    total: meetings.length,
    pending: meetings.filter(m => m.status === 'pending').length,
    qualified: meetings.filter(m => m.status === 'qualified').length,
    notQualified: meetings.filter(m => m.status === 'not_qualified').length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-400">Laddar möten...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href="/company/dashboard" className="text-xl font-semibold text-gray-900">
            Valdi
          </Link>
          <p className="text-xs text-gray-500 mt-1">{companyName}</p>
        </div>
        
        <nav className="mt-8 px-4">
          <Link 
            href="/company/dashboard" 
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Dashboard
          </Link>
          <Link 
            href="/company/campaigns" 
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Kampanjer
          </Link>
          <Link 
            href="/company/meetings" 
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
          >
            Möten
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            Logga ut
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 bg-white">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Bokade Möten</h1>
          <p className="text-sm text-gray-500 mt-1">Granska och godkänn möten som SDR:er har bokat</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Totalt Möten</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Väntar på Granskning</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.pending}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Godkända</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.qualified}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Nekade</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.notQualified}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filter === 'all'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Alla ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filter === 'pending'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Väntar ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('qualified')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filter === 'qualified'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Godkända ({stats.qualified})
            </button>
            <button
              onClick={() => setFilter('not_qualified')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filter === 'not_qualified'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Nekade ({stats.notQualified})
            </button>
          </div>
        </div>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <p className="text-sm text-gray-400">
              {filter === 'all' ? 'Inga möten ännu' : `Inga ${filter === 'pending' ? 'väntande' : filter === 'qualified' ? 'godkända' : 'nekade'} möten`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{meeting.contact_name}</h3>
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        meeting.status === 'qualified' ? 'bg-green-50 text-green-700 border border-green-200' :
                        meeting.status === 'not_qualified' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {meeting.status === 'qualified' ? 'Godkänd' :
                         meeting.status === 'not_qualified' ? 'Nekad' : 'Väntar'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Kampanj: <span className="font-medium">{meeting.campaign.title}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(meeting.meeting_date).toLocaleString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="text-base font-semibold text-gray-900 mt-1">
                      €{meeting.campaign.commission_per_meeting}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-4">
                  {/* Contact Details */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kontaktuppgifter</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      {meeting.contact_email && (
                        <div>{meeting.contact_email}</div>
                      )}
                      {meeting.contact_phone && (
                        <div>{meeting.contact_phone}</div>
                      )}
                      {!meeting.contact_email && !meeting.contact_phone && (
                        <div className="text-gray-400 text-xs">Inga ytterligare kontaktuppgifter</div>
                      )}
                    </div>
                  </div>

                  {/* Qualification Checklist */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kvalificeringskriterier</h4>
                    <div className="space-y-1">
                      {getQualificationCriteria(meeting.campaign.meeting_criteria).map((criterion, idx) => {
                        const isChecked = meeting.qualification_checklist?.[idx] || false
                        return (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={isChecked ? 'text-green-600 font-bold' : 'text-gray-300'}>
                              {isChecked ? '✓' : '○'}
                            </span>
                            <span className={isChecked ? 'text-gray-900' : 'text-gray-400'}>
                              {criterion}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {meeting.notes && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Anteckningar från SDR</h4>
                    <p className="text-sm text-gray-700">{meeting.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {meeting.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => updateMeetingStatus(meeting.id, 'qualified')}
                      className="flex-1 bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                    >
                      Godkänn Möte (€{meeting.campaign.commission_per_meeting})
                    </button>
                    <button
                      onClick={() => setRejectingMeetingId(meeting.id)}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Neka Möte
                    </button>
                  </div>
                )}

                {/* Rejection Modal */}
                {rejectingMeetingId === meeting.id && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Varför nekar du detta möte?</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Ge en anledning så att SDR:en förstår vad som gick fel
                      </p>
                      <select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
                      >
                        <option value="">Välj anledning...</option>
                        <option value="wrong_person">Fel person / inte beslutsfattare</option>
                        <option value="no_need">Inget aktivt behov</option>
                        <option value="no_budget">Ingen budget</option>
                        <option value="no_show">Mötet hände inte</option>
                        <option value="poor_quality">Dålig kvalitet på samtalet</option>
                        <option value="other">Annat</option>
                      </select>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            if (rejectionReason) {
                              updateMeetingStatus(meeting.id, 'not_qualified', rejectionReason)
                            } else {
                              alert('Välj en anledning')
                            }
                          }}
                          disabled={!rejectionReason}
                          className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bekräfta Nekande
                        </button>
                        <button
                          onClick={() => {
                            setRejectingMeetingId(null)
                            setRejectionReason('')
                          }}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {meeting.status !== 'pending' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Status ändrad {new Date(meeting.created_at).toLocaleDateString('sv-SE')}
                    </div>
                    {meeting.rejection_reason && meeting.status === 'not_qualified' && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium text-red-900">Nekad av anledning: </span>
                        <span className="text-red-700">
                          {meeting.rejection_reason === 'wrong_person' ? 'Fel person / inte beslutsfattare' :
                           meeting.rejection_reason === 'no_need' ? 'Inget aktivt behov' :
                           meeting.rejection_reason === 'no_budget' ? 'Ingen budget' :
                           meeting.rejection_reason === 'no_show' ? 'Mötet hände inte' :
                           meeting.rejection_reason === 'poor_quality' ? 'Dålig kvalitet' :
                           'Annat'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}