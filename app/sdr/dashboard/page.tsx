'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Campaign, Meeting, SDR } from '@/lib/supabase'

export default function SDRDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sdr, setSdr] = useState<SDR | null>(null)
  const [sdrName, setSdrName] = useState('')
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([])
  const [myMeetings, setMyMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState({
    totalMeetings: 0,
    qualifiedMeetings: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    qualificationRate: 0
  })

  useEffect(() => {
    checkAuth()
    loadDashboardData()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile) setSdrName(profile.full_name || '')

      const { data: sdrData } = await supabase
        .from('sdrs')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSdr(sdrData)

      if (!sdrData) return

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false})
        .limit(6)

      setAvailableCampaigns(campaignsData || [])

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*, campaigns(commission_per_meeting)')
        .eq('sdr_id', sdrData.id)
        .order('created_at', { ascending: false })

      setMyMeetings(meetingsData || [])

      let totalEarnings = 0
      let pendingEarnings = 0
      
      meetingsData?.forEach((meeting: any) => {
        const commission = meeting.campaigns?.commission_per_meeting || 300
        const sdrEarning = Math.floor(commission * 0.58)
        
        if (meeting.status === 'qualified') {
          totalEarnings += sdrEarning
        } else if (meeting.status === 'pending') {
          pendingEarnings += sdrEarning
        }
      })

      const qualifiedMeetings = meetingsData?.filter(m => m.status === 'qualified').length || 0
      const qualificationRate = meetingsData && meetingsData.length > 0 
        ? Math.round((qualifiedMeetings / meetingsData.length) * 100) 
        : 0

      setStats({
        totalMeetings: meetingsData?.length || 0,
        qualifiedMeetings,
        totalEarnings,
        pendingEarnings,
        qualificationRate
      })

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-400">Laddar...</div>
      </div>
    )
  }

  if (sdr?.status === 'pending') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Din ansökan granskas</h1>
          <p className="text-sm text-gray-600 mb-6">
            Vi granskar din profil och återkommer inom 1-2 arbetsdagar.
          </p>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-900 hover:underline"
          >
            Logga ut
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href="/sdr/dashboard" className="text-xl font-semibold text-gray-900">
            Valdi
          </Link>
          <p className="text-xs text-gray-500 mt-1">{sdrName}</p>
        </div>
        
        <nav className="mt-8 px-4">
          <Link 
            href="/sdr/dashboard" 
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
          >
            Dashboard
          </Link>
          <Link 
            href="/sdr/campaigns" 
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Kampanjer
          </Link>
          <Link 
            href="/sdr/earnings" 
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Intjäning
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
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Översikt över dina möten och intjäning</p>
        </div>

        {/* Stats Cards - SDR specific metrics */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Bokade Möten</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.totalMeetings}</div>
            <div className="text-xs text-gray-500 mt-1">Totalt loggade</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Godkända</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.qualifiedMeetings}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.qualificationRate}% godkänningsgrad</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Intjäning</div>
            <div className="text-3xl font-semibold text-gray-900">€{stats.totalEarnings}</div>
            <div className="text-xs text-gray-500 mt-1">Godkända betalningar</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Väntande</div>
            <div className="text-3xl font-semibold text-gray-900">€{stats.pendingEarnings}</div>
            <div className="text-xs text-gray-500 mt-1">Under granskning</div>
          </div>
        </div>

        {/* Quick Action - SDR specific */}
        <div className="mb-10">
          <Link
            href="/sdr/meetings/new"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
          >
            Logga Nytt Möte
          </Link>
        </div>

        {/* Available Campaigns - SDR can apply */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900">Tillgängliga Kampanjer</h2>
            <Link href="/sdr/campaigns" className="text-xs text-gray-500 hover:text-gray-700">
              Visa alla →
            </Link>
          </div>
          {availableCampaigns.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">Inga kampanjer just nu</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {availableCampaigns.slice(0, 6).map((campaign) => (
                <Link
                  key={campaign.id}
                  href="/sdr/campaigns"
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <h3 className="font-medium text-gray-900 text-sm mb-2 truncate">
                    {campaign.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {campaign.icp_description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900">
                      €{Math.floor(campaign.commission_per_meeting * 0.58)}
                    </span>
                    <span className="text-gray-500">per möte</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Meetings - Shows SDR's own meetings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-gray-900">Mina Senaste Möten</h2>
          </div>
          {myMeetings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">Inga möten bokade ännu</p>
              <Link
                href="/sdr/meetings/new"
                className="inline-block mt-3 text-xs text-gray-900 hover:underline"
              >
                Logga ditt första möte
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myMeetings.slice(0, 5).map((meeting) => (
                <div key={meeting.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">{meeting.contact_name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(meeting.meeting_date).toLocaleString('sv-SE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {meeting.status === 'not_qualified' && meeting?.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Nekad: {
                            meeting?.rejection_reason === 'wrong_person' ? 'Fel person / inte beslutsfattare' :
                            meeting?.rejection_reason === 'no_need' ? 'Inget aktivt behov' :
                            meeting?.rejection_reason === 'no_budget' ? 'Ingen budget' :
                            meeting?.rejection_reason === 'no_show' ? 'Mötet hände inte' :
                            meeting?.rejection_reason === 'poor_quality' ? 'Dålig kvalitet' :
                            'Annat'
                          }
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        meeting.status === 'qualified' ? 'bg-green-50 text-green-700 border border-green-200' :
                        meeting.status === 'not_qualified' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {meeting.status === 'qualified' ? 'Godkänd' :
                         meeting.status === 'not_qualified' ? 'Nekad' : 'Väntar'}
                      </span>
                      {meeting.status === 'qualified' && (
                        <div className="text-xs text-gray-600 font-medium mt-1">
                          +€{Math.floor(((meeting as any).campaigns?.commission_per_meeting || 300) * 0.58)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}