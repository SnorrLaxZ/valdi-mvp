import { z } from 'zod'

// Profile validations
export const profileSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
})

// Campaign validations
export const campaignSchema = z.object({
  title: z.string().min(1, 'Campaign title is required'),
  icp_description: z.string().min(10, 'ICP description must be at least 10 characters'),
  meeting_criteria: z.array(z.string()).min(2, 'At least 2 qualification criteria required'),
  script: z.string().optional(),
  commission_per_meeting: z.number().min(100).max(1000),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
})

// Meeting validations
export const meetingSchema = z.object({
  campaign_id: z.string().uuid(),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  meeting_date: z.string().datetime(),
  notes: z.string().optional(),
  qualification_checklist: z.array(z.boolean()).optional(),
})

// Dispute validations
export const disputeSchema = z.object({
  meeting_id: z.string().uuid(),
  dispute_type: z.enum(['qualification', 'quality', 'payment', 'other']),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

// Lead validations
export const leadSchema = z.object({
  campaign_id: z.string().uuid(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
  company_name: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['new', 'contacted', 'qualified', 'not_qualified', 'converted', 'suppressed']),
})

// Call Recording validations
export const callRecordingSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  sdr_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
})

// Admin Review validations
export const adminReviewSchema = z.object({
  meeting_id: z.string().uuid(),
  call_recording_id: z.string().uuid().optional(),
  review_decision: z.enum(['approve', 'reject', 'needs_revision']),
  review_notes: z.string().optional(),
  qualification_score: z.number().min(0).max(100).optional(),
  quality_score: z.number().min(0).max(100).optional(),
})

// SDR Application validations
export const applicationSchema = z.object({
  campaign_id: z.string().uuid(),
  sdr_id: z.string().uuid(),
})

// Outreach Attempt validations
export const outreachAttemptSchema = z.object({
  lead_id: z.string().uuid(),
  sdr_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  attempt_type: z.enum(['call', 'email', 'linkedin', 'other']),
  attempt_status: z.enum(['attempted', 'connected', 'voicemail', 'no_answer', 'busy', 'failed']),
  notes: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
})

