import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For client components
export const supabase = createClientComponentClient()

// Database types
export type UserType = 'company' | 'sdr' | 'admin'

// Core Tables
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
  meeting_criteria: string | string[] // DEPRECATED: Use call_criteria instead
  company_criteria?: {
    revenue?: { min?: number; max?: number; equals?: number }
    employees?: { min?: number; max?: number; equals?: number }
    industry?: string | string[]
    [key: string]: any
  } | null // Company/Prospect level criteria (revenue, employees, industry)
  call_criteria?: string | string[] | null // Call/Conversation level criteria (budget confirmed, etc.)
  script: string | null
  commission_per_meeting: number
  qualification_threshold?: number // Minimum score (0-100) to qualify, default 70
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
  // AI qualification fields
  ai_qualification_score?: {
    overall_score: number
    criteria_scores: Record<string, number>
    is_qualified: boolean
    confidence: number
    reasoning: string
    key_quotes: string[]
    objections: string[]
    next_steps: string[]
    meeting_readiness: 'ready' | 'not_ready' | 'needs_follow_up'
    criteria_met: string[]
    criteria_unmet: string[]
  } | null
  overall_qualification_score?: number | null // Denormalized for easy querying
  criteria_scores?: Record<string, number> | null // Individual criterion scores
  criteria_met?: string[] | null // Criteria that were met
  criteria_unmet?: string[] | null // Criteria that were not met
  qualification_confidence?: number | null // AI confidence (0-1)
  qualification_reasoning?: string | null // AI reasoning
  call_session_id?: string | null // Link to call session
  status: 'pending' | 'qualified' | 'not_qualified' | 'disputed'
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

// Governance Core Tables
export interface CallRecording {
  id: string
  meeting_id: string | null
  sdr_id: string
  campaign_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  duration_seconds: number | null
  transcription: string | null
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
  created_at: string
}

export interface AIScore {
  id: string
  call_recording_id: string | null
  meeting_id: string | null
  sdr_id: string
  score_type: 'call_quality' | 'qualification_match' | 'sdr_performance' | 'compliance'
  score_value: number
  score_details: Record<string, any> | null
  criteria_matches: Record<string, any> | null
  flagged_issues: Record<string, any> | null
  ai_model: string | null
  created_at: string
}

export interface Dispute {
  id: string
  meeting_id: string
  raised_by: string
  dispute_type: 'qualification' | 'quality' | 'payment' | 'other'
  reason: string
  status: 'open' | 'under_review' | 'resolved' | 'rejected'
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action_type: string
  resource_type: string
  resource_id: string | null
  changes: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AdminReview {
  id: string
  meeting_id: string
  call_recording_id: string | null
  reviewed_by: string
  review_decision: 'approve' | 'reject' | 'needs_revision'
  review_notes: string | null
  qualification_score: number | null
  quality_score: number | null
  created_at: string
}

export interface QualificationRule {
  id: string
  company_id: string | null
  rule_name: string
  rule_description: string | null
  criteria: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

// Lead & Outreach Engine Tables
export interface Lead {
  id: string
  campaign_id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  company_name: string | null
  linkedin_url: string | null
  enrichment_data: Record<string, any> | null
  // Company criteria fields
  company_revenue?: number | null // Annual revenue (NOK)
  company_employees?: number | null // Number of employees
  company_industry?: string | null // Industry type
  company_criteria_match?: Record<string, boolean> | null // Which company criteria were matched
  company_criteria_score?: number | null // Overall company criteria match score (0-100)
  all_company_criteria_met?: boolean | null // True if all company criteria are met
  status: 'new' | 'contacted' | 'qualified' | 'not_qualified' | 'converted' | 'suppressed'
  assigned_to_sdr_id: string | null
  created_at: string
  updated_at: string
}

export interface LeadEnrichment {
  id: string
  lead_id: string
  enrichment_source: string | null
  enrichment_data: Record<string, any>
  confidence_score: number | null
  created_at: string
}

export interface SuppressionList {
  id: string
  company_id: string
  email: string | null
  phone: string | null
  domain: string | null
  reason: string | null
  created_at: string
}

export interface OutreachAttempt {
  id: string
  lead_id: string
  sdr_id: string
  campaign_id: string
  attempt_type: 'call' | 'email' | 'linkedin' | 'other'
  attempt_status: 'attempted' | 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'failed'
  notes: string | null
  duration_seconds: number | null
  created_at: string
}

export interface OutreachStatus {
  id: string
  lead_id: string
  current_status: string
  previous_status: string | null
  changed_by: string | null
  notes: string | null
  created_at: string
}

// Performance & Analytics Tables
export interface SDRPerformanceMetrics {
  id: string
  sdr_id: string
  campaign_id: string | null
  period_start: string
  period_end: string
  total_meetings: number
  qualified_meetings: number
  qualification_rate: number | null
  total_earnings: number
  average_call_duration: number | null
  calls_made: number
  emails_sent: number
  show_rate: number | null
  created_at: string
  updated_at: string
}

export interface CampaignPerformanceMetrics {
  id: string
  campaign_id: string
  period_start: string
  period_end: string
  total_meetings: number
  qualified_meetings: number
  total_cost: number
  average_cost_per_meeting: number | null
  show_rate: number | null
  conversion_rate: number | null
  active_sdrs: number
  created_at: string
  updated_at: string
}

export interface MeetingShowRate {
  id: string
  meeting_id: string
  campaign_id: string
  sdr_id: string
  showed_up: boolean | null
  no_show_reason: string | null
  actual_meeting_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Training & Content Tables
export interface TrainingMaterial {
  id: string
  title: string
  content: string
  material_type: 'article' | 'video' | 'quiz' | 'script_template' | 'best_practices'
  category: string | null
  is_required: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SDRTrainingProgress {
  id: string
  sdr_id: string
  training_material_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at: string | null
  score: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CampaignScript {
  id: string
  campaign_id: string
  script_content: string
  version: number
  is_active: boolean
  created_by: string | null
  created_at: string
}

// AI & Routing Tables
export interface AIRoutingDecision {
  id: string
  campaign_id: string
  lead_id: string | null
  recommended_sdr_id: string | null
  confidence_score: number | null
  reasoning: Record<string, any> | null
  decision_status: 'pending' | 'accepted' | 'rejected' | 'overridden'
  overridden_by: string | null
  created_at: string
}

export interface PatternDetection {
  id: string
  pattern_type: 'quality_drop' | 'sdr_burnout' | 'campaign_issue' | 'compliance_risk' | 'fraud_risk'
  resource_type: string
  resource_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  pattern_data: Record<string, any>
  detected_at: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
}

export interface ComplianceCheck {
  id: string
  call_recording_id: string | null
  meeting_id: string | null
  check_type: 'gdpr' | 'consent' | 'data_retention' | 'call_recording' | 'other'
  check_status: 'pending' | 'passed' | 'failed' | 'needs_review'
  check_details: Record<string, any> | null
  checked_by: string | null
  checked_at: string | null
  created_at: string
}
