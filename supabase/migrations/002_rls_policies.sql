-- Row Level Security Policies
-- Enable RLS on all tables

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_show_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Companies policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own company"
  ON companies FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- SDRs policies
CREATE POLICY "SDRs can view their own profile"
  ON sdrs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "SDRs can update their own profile"
  ON sdrs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Companies can view SDRs"
  ON sdrs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type IN ('company', 'admin')
    )
  );

CREATE POLICY "Admins can manage all SDRs"
  ON sdrs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Campaigns policies
CREATE POLICY "Companies can view their own campaigns"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = campaigns.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can manage their own campaigns"
  ON campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = campaigns.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can view active campaigns"
  ON campaigns FOR SELECT
  USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'sdr'
    )
  );

CREATE POLICY "Admins can view all campaigns"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Campaign Applications policies
CREATE POLICY "SDRs can view their own applications"
  ON campaign_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = campaign_applications.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can create applications"
  ON campaign_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = campaign_applications.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view applications for their campaigns"
  ON campaign_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = campaign_applications.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update applications for their campaigns"
  ON campaign_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = campaign_applications.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all applications"
  ON campaign_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Meetings policies
CREATE POLICY "SDRs can view their own meetings"
  ON meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = meetings.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = meetings.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can update their own meetings"
  ON meetings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = meetings.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view meetings for their campaigns"
  ON meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = meetings.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update meetings for their campaigns"
  ON meetings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = meetings.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all meetings"
  ON meetings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Call Recordings policies
CREATE POLICY "SDRs can view their own call recordings"
  ON call_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = call_recordings.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can upload call recordings"
  ON call_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = call_recordings.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view call recordings for their campaigns"
  ON call_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = call_recordings.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all call recordings"
  ON call_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- AI Scores policies
CREATE POLICY "SDRs can view their own AI scores"
  ON ai_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = ai_scores.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view AI scores for their campaigns"
  ON ai_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN campaigns c ON c.id = m.campaign_id
      JOIN companies co ON co.id = c.company_id
      WHERE m.id = ai_scores.meeting_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all AI scores"
  ON ai_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Disputes policies
CREATE POLICY "Users can view disputes they raised"
  ON disputes FOR SELECT
  USING (raised_by = auth.uid());

CREATE POLICY "Users can create disputes"
  ON disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Companies can view disputes for their meetings"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN campaigns c ON c.id = m.campaign_id
      JOIN companies co ON co.id = c.company_id
      WHERE m.id = disputes.meeting_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all disputes"
  ON disputes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Audit Logs policies
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admin Reviews policies
CREATE POLICY "Admins can manage reviews"
  ON admin_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Companies can view reviews for their meetings"
  ON admin_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN campaigns c ON c.id = m.campaign_id
      JOIN companies co ON co.id = c.company_id
      WHERE m.id = admin_reviews.meeting_id AND co.user_id = auth.uid()
    )
  );

-- Qualification Rules policies
CREATE POLICY "Companies can manage their own rules"
  ON qualification_rules FOR ALL
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = qualification_rules.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all rules"
  ON qualification_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Leads policies
CREATE POLICY "Companies can manage their own leads"
  ON leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = leads.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can view leads assigned to them"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = leads.assigned_to_sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all leads"
  ON leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Lead Enrichments policies
CREATE POLICY "Users can view enrichments for accessible leads"
  ON lead_enrichments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_enrichments.lead_id AND (
        EXISTS (
          SELECT 1 FROM companies co
          WHERE co.id = l.company_id AND co.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM sdrs s
          WHERE s.id = l.assigned_to_sdr_id AND s.user_id = auth.uid()
        )
      )
    )
  );

-- Suppression Lists policies
CREATE POLICY "Companies can manage their own suppression lists"
  ON suppression_lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = suppression_lists.company_id AND user_id = auth.uid()
    )
  );

-- Outreach Attempts policies
CREATE POLICY "SDRs can view their own outreach attempts"
  ON outreach_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = outreach_attempts.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can create outreach attempts"
  ON outreach_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = outreach_attempts.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view outreach attempts for their campaigns"
  ON outreach_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = outreach_attempts.campaign_id AND co.user_id = auth.uid()
    )
  );

-- Outreach Statuses policies
CREATE POLICY "Users can view statuses for accessible leads"
  ON outreach_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = outreach_statuses.lead_id AND (
        EXISTS (
          SELECT 1 FROM companies co
          WHERE co.id = l.company_id AND co.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM sdrs s
          WHERE s.id = l.assigned_to_sdr_id AND s.user_id = auth.uid()
        )
      )
    )
  );

-- Performance Metrics policies
CREATE POLICY "SDRs can view their own performance metrics"
  ON sdr_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = sdr_performance_metrics.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view performance metrics for their campaigns"
  ON campaign_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = campaign_performance_metrics.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all performance metrics"
  ON sdr_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all campaign performance metrics"
  ON campaign_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Meeting Show Rates policies
CREATE POLICY "SDRs can view show rates for their meetings"
  ON meeting_show_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = meeting_show_rates.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view show rates for their campaigns"
  ON meeting_show_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = meeting_show_rates.campaign_id AND co.user_id = auth.uid()
    )
  );

-- Training Materials policies
CREATE POLICY "Everyone can view training materials"
  ON training_materials FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage training materials"
  ON training_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- SDR Training Progress policies
CREATE POLICY "SDRs can view their own training progress"
  ON sdr_training_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = sdr_training_progress.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can update their own training progress"
  ON sdr_training_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = sdr_training_progress.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all training progress"
  ON sdr_training_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Campaign Scripts policies
CREATE POLICY "Companies can view scripts for their campaigns"
  ON campaign_scripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = campaign_scripts.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can manage scripts for their campaigns"
  ON campaign_scripts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = campaign_scripts.campaign_id AND co.user_id = auth.uid()
    )
  );

-- AI Routing Decisions policies
CREATE POLICY "Companies can view routing decisions for their campaigns"
  ON ai_routing_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = ai_routing_decisions.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage routing decisions"
  ON ai_routing_decisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Pattern Detections policies
CREATE POLICY "Admins can view all pattern detections"
  ON pattern_detections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can view pattern detections for their resources"
  ON pattern_detections FOR SELECT
  USING (
    (resource_type = 'sdr' AND EXISTS (
      SELECT 1 FROM sdrs WHERE id = resource_id::uuid AND user_id = auth.uid()
    )) OR
    (resource_type = 'campaign' AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = resource_id::uuid AND co.user_id = auth.uid()
    ))
  );

-- Compliance Checks policies
CREATE POLICY "Admins can manage compliance checks"
  ON compliance_checks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Companies can view compliance checks for their meetings"
  ON compliance_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN campaigns c ON c.id = m.campaign_id
      JOIN companies co ON co.id = c.company_id
      WHERE m.id = compliance_checks.meeting_id AND co.user_id = auth.uid()
    )
  );

