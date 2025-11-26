-- Triggers and Functions for Audit Logging and Automation

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ),
    NULL, -- IP address from application context
    NULL  -- User agent from application context
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers for critical tables
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_meetings
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_disputes
  AFTER INSERT OR UPDATE OR DELETE ON disputes
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_call_recordings
  AFTER INSERT OR UPDATE OR DELETE ON call_recordings
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'sdr')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to calculate SDR qualification rate
CREATE OR REPLACE FUNCTION calculate_sdr_qualification_rate(sdr_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_meetings INTEGER;
  qualified_meetings INTEGER;
  rate DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO total_meetings
  FROM meetings
  WHERE sdr_id = sdr_uuid AND status IN ('qualified', 'not_qualified');
  
  SELECT COUNT(*) INTO qualified_meetings
  FROM meetings
  WHERE sdr_id = sdr_uuid AND status = 'qualified';
  
  IF total_meetings > 0 THEN
    rate := (qualified_meetings::DECIMAL / total_meetings::DECIMAL) * 100;
  ELSE
    rate := 0;
  END IF;
  
  RETURN rate;
END;
$$ LANGUAGE plpgsql;

-- Function to update SDR qualification rate
CREATE OR REPLACE FUNCTION update_sdr_qualification_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sdrs
  SET qualification_rate = calculate_sdr_qualification_rate(NEW.sdr_id)
  WHERE id = NEW.sdr_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update qualification rate when meeting status changes
CREATE TRIGGER update_qualification_rate_on_meeting_change
  AFTER INSERT OR UPDATE OF status ON meetings
  FOR EACH ROW
  WHEN (NEW.status IN ('qualified', 'not_qualified'))
  EXECUTE FUNCTION update_sdr_qualification_rate();

-- Function to update campaign performance metrics
CREATE OR REPLACE FUNCTION update_campaign_performance()
RETURNS TRIGGER AS $$
DECLARE
  campaign_uuid UUID;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  campaign_uuid := NEW.campaign_id;
  period_start := date_trunc('month', NEW.created_at);
  period_end := (period_start + interval '1 month') - interval '1 day';
  
  INSERT INTO campaign_performance_metrics (
    campaign_id,
    period_start,
    period_end,
    total_meetings,
    qualified_meetings,
    total_cost,
    average_cost_per_meeting,
    active_sdrs
  )
  SELECT
    campaign_uuid,
    period_start,
    period_end,
    COUNT(*) FILTER (WHERE status IN ('qualified', 'not_qualified', 'pending')),
    COUNT(*) FILTER (WHERE status = 'qualified'),
    SUM(c.commission_per_meeting) FILTER (WHERE m.status = 'qualified'),
    AVG(c.commission_per_meeting) FILTER (WHERE m.status = 'qualified'),
    COUNT(DISTINCT m.sdr_id)
  FROM meetings m
  JOIN campaigns c ON c.id = m.campaign_id
  WHERE m.campaign_id = campaign_uuid
    AND m.created_at >= period_start
    AND m.created_at <= period_end
  GROUP BY campaign_uuid, period_start, period_end
  ON CONFLICT (campaign_id, period_start, period_end)
  DO UPDATE SET
    total_meetings = EXCLUDED.total_meetings,
    qualified_meetings = EXCLUDED.qualified_meetings,
    total_cost = EXCLUDED.total_cost,
    average_cost_per_meeting = EXCLUDED.average_cost_per_meeting,
    active_sdrs = EXCLUDED.active_sdrs,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign performance when meeting is created/updated
CREATE TRIGGER update_campaign_performance_on_meeting
  AFTER INSERT OR UPDATE OF status ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_performance();

-- Function to update SDR performance metrics
CREATE OR REPLACE FUNCTION update_sdr_performance()
RETURNS TRIGGER AS $$
DECLARE
  sdr_uuid UUID;
  campaign_uuid UUID;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  sdr_uuid := NEW.sdr_id;
  campaign_uuid := NEW.campaign_id;
  period_start := date_trunc('month', NEW.created_at);
  period_end := (period_start + interval '1 month') - interval '1 day';
  
  INSERT INTO sdr_performance_metrics (
    sdr_id,
    campaign_id,
    period_start,
    period_end,
    total_meetings,
    qualified_meetings,
    qualification_rate,
    total_earnings
  )
  SELECT
    sdr_uuid,
    campaign_uuid,
    period_start,
    period_end,
    COUNT(*) FILTER (WHERE status IN ('qualified', 'not_qualified', 'pending')),
    COUNT(*) FILTER (WHERE status = 'qualified'),
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('qualified', 'not_qualified')) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'qualified')::DECIMAL / 
            COUNT(*) FILTER (WHERE status IN ('qualified', 'not_qualified'))::DECIMAL) * 100
      ELSE 0
    END,
    SUM(c.commission_per_meeting * 0.58) FILTER (WHERE m.status = 'qualified')
  FROM meetings m
  JOIN campaigns c ON c.id = m.campaign_id
  WHERE m.sdr_id = sdr_uuid
    AND m.campaign_id = campaign_uuid
    AND m.created_at >= period_start
    AND m.created_at <= period_end
  GROUP BY sdr_uuid, campaign_uuid, period_start, period_end
  ON CONFLICT (sdr_id, campaign_id, period_start, period_end)
  DO UPDATE SET
    total_meetings = EXCLUDED.total_meetings,
    qualified_meetings = EXCLUDED.qualified_meetings,
    qualification_rate = EXCLUDED.qualification_rate,
    total_earnings = EXCLUDED.total_earnings,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update SDR performance when meeting is created/updated
CREATE TRIGGER update_sdr_performance_on_meeting
  AFTER INSERT OR UPDATE OF status ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_sdr_performance();

-- Function to check if lead is suppressed
CREATE OR REPLACE FUNCTION is_lead_suppressed(
  company_uuid UUID,
  lead_email TEXT,
  lead_phone TEXT,
  lead_domain TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM suppression_lists
    WHERE company_id = company_uuid
      AND (
        (email IS NOT NULL AND email = lead_email) OR
        (phone IS NOT NULL AND phone = lead_phone) OR
        (domain IS NOT NULL AND domain = lead_domain)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get available SDRs for a campaign
CREATE OR REPLACE FUNCTION get_available_sdrs_for_campaign(campaign_uuid UUID)
RETURNS TABLE (
  sdr_id UUID,
  sdr_name TEXT,
  qualification_rate DECIMAL(5,2),
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    p.full_name,
    COALESCE(s.qualification_rate, 0),
    s.status
  FROM sdrs s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM campaign_applications ca
      WHERE ca.campaign_id = campaign_uuid
        AND ca.sdr_id = s.id
        AND ca.status = 'rejected'
    )
  ORDER BY s.qualification_rate DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_uuid UUID)
RETURNS TABLE (
  total_meetings INTEGER,
  qualified_meetings INTEGER,
  pending_meetings INTEGER,
  not_qualified_meetings INTEGER,
  total_cost DECIMAL(10,2),
  average_cost_per_meeting DECIMAL(10,2),
  active_sdrs INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE m.status IN ('qualified', 'not_qualified', 'pending'))::INTEGER,
    COUNT(*) FILTER (WHERE m.status = 'qualified')::INTEGER,
    COUNT(*) FILTER (WHERE m.status = 'pending')::INTEGER,
    COUNT(*) FILTER (WHERE m.status = 'not_qualified')::INTEGER,
    SUM(c.commission_per_meeting) FILTER (WHERE m.status = 'qualified'),
    AVG(c.commission_per_meeting) FILTER (WHERE m.status = 'qualified'),
    COUNT(DISTINCT m.sdr_id)::INTEGER
  FROM meetings m
  JOIN campaigns c ON c.id = m.campaign_id
  WHERE m.campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

