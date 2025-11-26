import { supabase } from './supabase'
import type {
  Profile,
  Company,
  SDR,
  Campaign,
  CampaignApplication,
  Meeting,
  CallRecording,
  Lead,
  Dispute,
  AdminReview,
} from './supabase'

// Profile utilities
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return data
}

// Company utilities
export async function getCompanyByUserId(userId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching company:', error)
    return null
  }

  return data
}

// SDR utilities
export async function getSDRByUserId(userId: string): Promise<SDR | null> {
  const { data, error } = await supabase
    .from('sdrs')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching SDR:', error)
    return null
  }

  return data
}

// Campaign utilities
export async function getCampaignsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching campaigns:', error)
    return []
  }

  return data || []
}

export async function getActiveCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active campaigns:', error)
    return []
  }

  return data || []
}

// Meeting utilities
export async function getMeetingsByCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching meetings:', error)
    return []
  }

  return data || []
}

export async function getMeetingsBySDR(sdrId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, campaigns(*)')
    .eq('sdr_id', sdrId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching SDR meetings:', error)
    return []
  }

  return data || []
}

export async function updateMeetingStatus(
  meetingId: string,
  status: Meeting['status'],
  rejectionReason?: string
) {
  const updateData: any = { status }
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason
  }

  const { data, error } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating meeting:', error)
    return null
  }

  return data
}

// Campaign Application utilities
export async function applyToCampaign(campaignId: string, sdrId: string) {
  const { data, error } = await supabase
    .from('campaign_applications')
    .insert({
      campaign_id: campaignId,
      sdr_id: sdrId,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error applying to campaign:', error)
    return null
  }

  return data
}

export async function updateApplicationStatus(
  applicationId: string,
  status: CampaignApplication['status']
) {
  const { data, error } = await supabase
    .from('campaign_applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating application:', error)
    return null
  }

  return data
}

// Call Recording utilities
export async function uploadCallRecording(
  recording: Omit<CallRecording, 'id' | 'created_at' | 'uploaded_at'>
) {
  const { data, error } = await supabase
    .from('call_recordings')
    .insert(recording)
    .select()
    .single()

  if (error) {
    console.error('Error uploading call recording:', error)
    return null
  }

  return data
}

// Dispute utilities
export async function createDispute(dispute: Omit<Dispute, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('disputes')
    .insert(dispute)
    .select()
    .single()

  if (error) {
    console.error('Error creating dispute:', error)
    return null
  }

  return data
}

export async function getDisputesByMeeting(meetingId: string) {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching disputes:', error)
    return []
  }

  return data || []
}

// Lead utilities
export async function getLeadsByCampaign(campaignId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching leads:', error)
    return []
  }

  return data || []
}

export async function getLeadsBySDR(sdrId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_to_sdr_id', sdrId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching SDR leads:', error)
    return []
  }

  return data || []
}

