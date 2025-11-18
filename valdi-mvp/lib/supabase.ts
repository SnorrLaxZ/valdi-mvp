import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For client components
export const supabase = createClientComponentClient()

// Database types
export type UserType = 'company' | 'sdr' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  user_type: UserType
  company_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  user_id: string
  company_name: string
  industry: string | null
  website: string | null
  created_at: string
}

export interface SDR {
  id: string
  user_id: string
  experience_years: number | null
  bio: string | null
  sample_call_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  qualification_rate: number | null
  created_at: string
}

export interface Campaign {
  id: string
  company_id: string
  title: string
  icp_description: string
  meeting_criteria: string
  script: string | null
  commission_per_meeting: number
  status: 'draft' | 'active' | 'paused' | 'completed'
  created_at: string
  updated_at: string
}

export interface CampaignApplication {
  id: string
  campaign_id: string
  sdr_id: string
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
}

export interface Meeting {
  id: string
  campaign_id: string
  sdr_id: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  meeting_date: string
  notes: string | null
  qualification_checklist: boolean[] | null
  status: 'pending' | 'qualified' | 'not_qualified'
  created_at: string
}