'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/lib/supabase'

export default function CampaignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [companyName, setCompanyName] = useState('')

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

      setCampaigns(campaignsData || [])
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

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId)

      if (error) throw error
      loadCampaigns()
    } catch (error) {
      console.error('Error updating campaign:', error)
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
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            Dashboard
          </Link>
          <Link 
            href="/company/campaigns" 
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
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
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Kampanjer</h1>
            <p className="text-sm text-gray-500 mt-1">Hantera dina outbound-kampanjer</p>
          </div>
          <Link
            href="/company/campaigns/new"
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
          >
            Skapa Ny Kampanj
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            <p className="text-sm text-gray-400 mb-4">Inga kampanjer ännu</p>
            <Link
              href="/company/campaigns/new"
              className="inline-block bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition text-sm font-medium"
            >
              Skapa Första Kampanjen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">{campaign.title}</h2>
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
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
                    <p className="text-sm text-gray-600 mb-3">{campaign.icp_description}</p>
                    
                    {/* Qualification checklist */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kvalificeringskriterier:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {getQualificationCriteria(campaign.meeting_criteria).map((criterion, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-6 text-xs text-gray-500">
                      <span>€{campaign.commission_per_meeting} per möte</span>
                      <span>Skapad {new Date(campaign.created_at).toLocaleDateString('sv-SE')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'active')}
                      className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition text-xs font-medium"
                    >
                      Publicera
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-xs font-medium"
                    >
                      Pausa
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <>
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'active')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition text-xs font-medium"
                      >
                        Aktivera
                      </button>
                      <button
                        onClick={() => updateCampaignStatus(campaign.id, 'completed')}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-xs font-medium"
                      >
                        Avsluta
                      </button>
                    </>
                  )}
                  <Link
                    href={`/company/campaigns/${campaign.id}`}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-xs font-medium"
                  >
                    Visa Detaljer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}