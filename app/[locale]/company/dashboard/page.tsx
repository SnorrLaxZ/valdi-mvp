'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import type { Campaign, Meeting } from '@/lib/supabase'

export default function CompanyDashboard() {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [companyName, setCompanyName] = useState('')
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalMeetings: 0,
    qualifiedMeetings: 0,
    pendingReview: 0
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

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!company) return
      setCompanyName(company.company_name)

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*, campaigns!inner(company_id)')
        .eq('campaigns.company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setCampaigns(campaignsData || [])
      setMeetings(meetingsData || [])

      const activeCampaigns = campaignsData?.filter(c => c.status === 'active').length || 0
      const qualifiedMeetings = meetingsData?.filter(m => m.status === 'qualified').length || 0
      const pendingReview = meetingsData?.filter(m => m.status === 'pending').length || 0

      setStats({
        totalCampaigns: campaignsData?.length || 0,
        activeCampaigns,
        totalMeetings: meetingsData?.length || 0,
        qualifiedMeetings,
        pendingReview
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
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
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
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
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
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Översikt över kampanjer och möten</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kampanjer</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.totalCampaigns}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.activeCampaigns} aktiva</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Möten Bokade</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.totalMeetings}</div>
            <div className="text-xs text-gray-500 mt-1">Av SDR:er</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Godkända</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.qualifiedMeetings}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.totalMeetings > 0 ? Math.round((stats.qualifiedMeetings / stats.totalMeetings) * 100) : 0}% godkänningsgrad
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Väntar Granskning</div>
            <div className="text-3xl font-semibold text-gray-900">{stats.pendingReview}</div>
            <div className="text-xs text-gray-500 mt-1">Behöver godkännas</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-10">
          <Link 
            href="/company/campaigns/new"
            className="flex-1 bg-gray-900 text-white px-6 py-4 rounded-lg hover:bg-gray-800 transition text-sm font-medium text-center"
          >
            Skapa Ny Kampanj
          </Link>
          {stats.pendingReview > 0 && (
            <Link 
              href="/company/meetings"
              className="flex-1 bg-white border border-gray-300 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-center"
            >
              Granska {stats.pendingReview} Möten
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Campaigns */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Senaste Kampanjer</h2>
              <Link href="/company/campaigns" className="text-xs text-gray-500 hover:text-gray-700">
                Visa alla →
              </Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">Inga kampanjer ännu</p>
                <Link 
                  href="/company/campaigns/new"
                  className="inline-block mt-3 text-xs text-gray-900 hover:underline"
                >
                  Skapa din första
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{campaign.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {campaign.icp_description}
                        </p>
                      </div>
                      <span className={`ml-3 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        campaign.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                        campaign.status === 'paused' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        campaign.status === 'draft' ? 'bg-gray-50 text-gray-700 border border-gray-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {campaign.status === 'active' ? 'Aktiv' :
                         campaign.status === 'paused' ? 'Pausad' :
                         campaign.status === 'draft' ? 'Utkast' : 'Avslutad'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Meetings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Senaste Möten</h2>
              <Link href="/company/meetings" className="text-xs text-gray-500 hover:text-gray-700">
                Visa alla →
              </Link>
            </div>
            {meetings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">Inga möten bokade ännu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">{meeting.contact_name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(meeting.meeting_date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                        </p>
                      </div>
                      <span className={`ml-3 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        meeting.status === 'qualified' ? 'bg-green-50 text-green-700 border border-green-200' :
                        meeting.status === 'not_qualified' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {meeting.status === 'qualified' ? 'Godkänd' :
                         meeting.status === 'not_qualified' ? 'Nekad' : 'Väntar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}