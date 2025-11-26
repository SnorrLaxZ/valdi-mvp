import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { Campaign, Lead, Meeting, CampaignApplication } from '../supabase'

export interface CampaignDetails extends Campaign {
  leads?: Lead[]
  meetings?: Meeting[]
  applications?: CampaignApplication[]
  company?: {
    id: string
    company_name: string
  }
}

export function useCampaign(campaignId: string | null) {
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId) {
      setLoading(false)
      return
    }

    loadCampaign()
  }, [campaignId])

  const loadCampaign = async () => {
    if (!campaignId) return

    try {
      setLoading(true)
      setError(null)

      // Load campaign with company
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          companies (id, company_name)
        `)
        .eq('id', campaignId)
        .single()

      if (campaignError) throw campaignError

      // Load leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      // Load meetings
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      // Load applications
      const { data: applicationsData } = await supabase
        .from('campaign_applications')
        .select('*')
        .eq('campaign_id', campaignId)

      setCampaign({
        ...campaignData,
        leads: leadsData || [],
        meetings: meetingsData || [],
        applications: applicationsData || [],
        company: (campaignData as any).companies,
      } as CampaignDetails)
    } catch (err: any) {
      console.error('Error loading campaign:', err)
      setError(err.message || 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  return { campaign, loading, error, refetch: loadCampaign }
}


