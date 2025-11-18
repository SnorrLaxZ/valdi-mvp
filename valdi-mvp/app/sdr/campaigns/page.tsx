'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/lib/supabase'

interface CampaignWithApplication extends Campaign {
  applicationStatus?: 'none' | 'pending' | 'approved' | 'rejected'
  company?: {
    company_name: string
    total_meetings: number
    qualified_meetings: number
  }
}

export default function SDRCampaignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<CampaignWithApplication[]>([])
  const [sdrId, setSdrId] = useState<string | null>(null)
  const [sdrName, setSdrName] = useState('')

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile) setSdrName(profile.full_name || '')

      const { data: sdr } = await supabase
        .from('sdrs')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!sdr) return
      setSdrId(sdr.id)

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies (
            company_name,
            total_meetings,
            qualified_meetings
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!campaignsData) return

      const { data: applications } = await supabase
        .from('campaign_applications')
        .select('campaign_id, status')
        .eq('sdr_id', sdr.id)

      const campaignsWithStatus = campaignsData.map(campaign => {
        const application = applications?.find(app => app.campaign_id === campaign.id)
        return {
          ...campaign,
          company: (campaign as any).companies,
          applicationStatus: application ? application.status as 'pending' | 'approved' | 'rejected' : 'none'
        }
      })

      setCampaigns(campaignsWithStatus)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getQualificationCriteria = (meetingCriteria: string): string[] => {
    try {
      return JSON.parse(meetingCriteria)
    } catch {
      return [meetingCriteria]
    }
  }

  const getApprovalRate = (company: any) => {
    if (!company || company.total_meetings === 0) return null
    return Math.round((company.qualified_meetings / company.total_meetings) * 100)
  }

  const applyToCampaign = async (campaignId: string) => {
    if (!sdrId) return

    try {
      const { error } = await supabase
        .from('campaign_applications')
        .insert({
          campaign_id: campaignId,
          sdr_id: sdrId,
          status: 'pending'
        })

      if (error) throw error
      loadCampaigns()
    } catch (error) {
      console.error('Error applying to campaign:', error)
      alert('Kunde inte skicka ansökan. Försök igen.')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-400">Laddar kampanjer...</div>
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
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Dashboard
          </Link>
          <Link 
            href="/sdr/campaigns" 
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
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
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">Tillgängliga Kampanjer</h1>
          <p className="text-sm text-gray-500 mt-1">Ansök till kampanjer och börja boka möten</p>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <p className="text-sm text-gray-400">Inga aktiva kampanjer just nu</p>
            <p className="text-xs text-gray-400 mt-1">Kom tillbaka snart för nya möjligheter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition"
              >
                {/* Campaign Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{campaign.title}</h3>
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className="font-semibold text-gray-900">€{campaign.commission_per_meeting}</span>
                    <span className="text-gray-500">per möte</span>
                  </div>
                  {campaign.company && getApprovalRate(campaign.company) !== null && (
                    <div className="text-xs">
                      {getApprovalRate(campaign.company)! >= 70 ? (
                        <span className="text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                          {getApprovalRate(campaign.company)}% godkänningsgrad
                        </span>
                      ) : getApprovalRate(campaign.company)! >= 50 ? (
                        <span className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                          {getApprovalRate(campaign.company)}% godkänningsgrad
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                          {getApprovalRate(campaign.company)}% godkänningsgrad
                        </span>
                      )}
                      <span className="text-gray-500 ml-2">
                        ({campaign.company.qualified_meetings}/{campaign.company.total_meetings})
                      </span>
                    </div>
                  )}
                </div>

                {/* Campaign Body */}
                <div className="p-6 space-y-4">
                  {/* ICP */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Målgrupp</h4>
                    <p className="text-xs text-gray-700 line-clamp-3">{campaign.icp_description}</p>
                  </div>

                  {/* Qualification Criteria */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kvalificeringskriterier</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {getQualificationCriteria(campaign.meeting_criteria).slice(0, 3).map((criterion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="line-clamp-1">{criterion}</span>
                        </li>
                      ))}
                      {getQualificationCriteria(campaign.meeting_criteria).length > 3 && (
                        <li className="text-gray-400 text-xs">
                          +{getQualificationCriteria(campaign.meeting_criteria).length - 3} fler...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Earnings */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Du tjänar:</span>
                      <span className="text-base font-semibold text-gray-900">
                        €{Math.floor(campaign.commission_per_meeting * 0.58)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">per kvalificerat möte</p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 pb-6">
                  {campaign.applicationStatus === 'none' && (
                    <button
                      onClick={() => applyToCampaign(campaign.id)}
                      className="w-full bg-gray-900 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 transition"
                    >
                      Ansök Nu
                    </button>
                  )}
                  {campaign.applicationStatus === 'pending' && (
                    <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-2.5 rounded-md text-sm font-medium text-center">
                      Väntar på godkännande
                    </div>
                  )}
                  {campaign.applicationStatus === 'approved' && (
                    <Link
                      href={`/sdr/campaigns/${campaign.id}`}
                      className="block w-full bg-green-50 border border-green-200 text-green-800 py-2.5 rounded-md text-sm font-medium hover:bg-green-100 transition text-center"
                    >
                      Godkänd - Börja Arbeta
                    </Link>
                  )}
                  {campaign.applicationStatus === 'rejected' && (
                    <div className="w-full bg-red-50 border border-red-200 text-red-800 py-2.5 rounded-md text-sm font-medium text-center">
                      Ansökan nekad
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}