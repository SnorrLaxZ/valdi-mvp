-- Valdi Full System Schema
-- Core Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (enhanced)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('company', 'sdr', 'admin')),
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SDRs table (enhanced)
CREATE TABLE IF NOT EXISTS sdrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  experience_years INTEGER,
  bio TEXT,
  sample_call_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  qualification_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns table (enhanced)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icp_description TEXT NOT NULL,
  meeting_criteria JSONB NOT NULL,
  script TEXT,
  commission_per_meeting DECIMAL(10,2) NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign Applications table
CREATE TABLE IF NOT EXISTS campaign_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, sdr_id)
);

-- Meetings table (enhanced)
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  meeting_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  qualification_checklist JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'not_qualified', 'disputed')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Governance Core Tables

-- Call Recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration_seconds INTEGER,
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Scores table
CREATE TABLE IF NOT EXISTS ai_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_recording_id UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL CHECK (score_type IN ('call_quality', 'qualification_match', 'sdr_performance', 'compliance')),
  score_value DECIMAL(5,2) NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
  score_details JSONB,
  criteria_matches JSONB,
  flagged_issues JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('qualification', 'quality', 'payment', 'other')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin Reviews table
CREATE TABLE IF NOT EXISTS admin_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  call_recording_id UUID REFERENCES call_recordings(id),
  reviewed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_decision TEXT NOT NULL CHECK (review_decision IN ('approve', 'reject', 'needs_revision')),
  review_notes TEXT,
  qualification_score DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Qualification Rules table
CREATE TABLE IF NOT EXISTS qualification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead & Outreach Engine Tables

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  company_name TEXT,
  linkedin_url TEXT,
  enrichment_data JSONB,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'not_qualified', 'converted', 'suppressed')),
  assigned_to_sdr_id UUID REFERENCES sdrs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead Enrichments table
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  enrichment_source TEXT,
  enrichment_data JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppression Lists table
CREATE TABLE IF NOT EXISTS suppression_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  domain TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, COALESCE(email, ''), COALESCE(phone, ''), COALESCE(domain, ''))
);

-- Outreach Attempts table
CREATE TABLE IF NOT EXISTS outreach_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('call', 'email', 'linkedin', 'other')),
  attempt_status TEXT NOT NULL CHECK (attempt_status IN ('attempted', 'connected', 'voicemail', 'no_answer', 'busy', 'failed')),
  notes TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outreach Statuses table
CREATE TABLE IF NOT EXISTS outreach_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL,
  previous_status TEXT,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Analytics Tables

-- SDR Performance Metrics table
CREATE TABLE IF NOT EXISTS sdr_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_meetings INTEGER DEFAULT 0,
  qualified_meetings INTEGER DEFAULT 0,
  qualification_rate DECIMAL(5,2),
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_call_duration INTEGER,
  calls_made INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  show_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sdr_id, campaign_id, period_start, period_end)
);

-- Campaign Performance Metrics table
CREATE TABLE IF NOT EXISTS campaign_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_meetings INTEGER DEFAULT 0,
  qualified_meetings INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  average_cost_per_meeting DECIMAL(10,2),
  show_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  active_sdrs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, period_start, period_end)
);

-- Meeting Show Rates table
CREATE TABLE IF NOT EXISTS meeting_show_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  showed_up BOOLEAN,
  no_show_reason TEXT,
  actual_meeting_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training & Content Tables

-- Training Materials table
CREATE TABLE IF NOT EXISTS training_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('article', 'video', 'quiz', 'script_template', 'best_practices')),
  category TEXT,
  is_required BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SDR Training Progress table
CREATE TABLE IF NOT EXISTS sdr_training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  training_material_id UUID NOT NULL REFERENCES training_materials(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sdr_id, training_material_id)
);

-- Campaign Scripts table
CREATE TABLE IF NOT EXISTS campaign_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  script_content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI & Routing Tables

-- AI Routing Decisions table
CREATE TABLE IF NOT EXISTS ai_routing_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  recommended_sdr_id UUID REFERENCES sdrs(id),
  confidence_score DECIMAL(5,2),
  reasoning JSONB,
  decision_status TEXT DEFAULT 'pending' CHECK (decision_status IN ('pending', 'accepted', 'rejected', 'overridden')),
  overridden_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pattern Detections table
CREATE TABLE IF NOT EXISTS pattern_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('quality_drop', 'sdr_burnout', 'campaign_issue', 'compliance_risk', 'fraud_risk')),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  pattern_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Compliance Checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_recording_id UUID REFERENCES call_recordings(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('gdpr', 'consent', 'data_retention', 'call_recording', 'other')),
  check_status TEXT NOT NULL DEFAULT 'pending' CHECK (check_status IN ('pending', 'passed', 'failed', 'needs_review')),
  check_details JSONB,
  checked_by UUID REFERENCES profiles(id),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_user_id ON sdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_sdrs_status ON sdrs(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_sdr_id ON campaign_applications(sdr_id);
CREATE INDEX IF NOT EXISTS idx_meetings_campaign_id ON meetings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meetings_sdr_id ON meetings(sdr_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_call_recordings_meeting_id ON call_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_sdr_id ON call_recordings(sdr_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_meeting_id ON ai_scores(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_sdr_id ON ai_scores(sdr_id);
CREATE INDEX IF NOT EXISTS idx_disputes_meeting_id ON disputes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_attempts_lead_id ON outreach_attempts(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_attempts_sdr_id ON outreach_attempts(sdr_id);
CREATE INDEX IF NOT EXISTS idx_sdr_performance_sdr_id ON sdr_performance_metrics(sdr_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign_id ON campaign_performance_metrics(campaign_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_rules_updated_at BEFORE UPDATE ON qualification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sdr_performance_updated_at BEFORE UPDATE ON sdr_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_performance_updated_at BEFORE UPDATE ON campaign_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_show_rates_updated_at BEFORE UPDATE ON meeting_show_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_materials_updated_at BEFORE UPDATE ON training_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sdr_training_progress_updated_at BEFORE UPDATE ON sdr_training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

