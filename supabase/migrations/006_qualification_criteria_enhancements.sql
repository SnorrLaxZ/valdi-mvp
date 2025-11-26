-- Qualification Criteria Enhancements
-- Better support for dynamic, company-defined qualification criteria

-- Add qualification threshold to campaigns (per-company customization)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS qualification_threshold DECIMAL(5,2) DEFAULT 70.00 CHECK (qualification_threshold >= 0 AND qualification_threshold <= 100);

-- Enhance meetings table with detailed qualification scores
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS ai_qualification_score JSONB, -- Full QualificationScore object from AI
  ADD COLUMN IF NOT EXISTS overall_qualification_score DECIMAL(5,2), -- Overall score (0-100) for easy querying
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB, -- Individual criterion scores { "criterion": score }
  ADD COLUMN IF NOT EXISTS criteria_met TEXT[], -- Array of criteria that were met
  ADD COLUMN IF NOT EXISTS criteria_unmet TEXT[], -- Array of criteria that were not met
  ADD COLUMN IF NOT EXISTS qualification_confidence DECIMAL(5,2), -- AI confidence (0-1)
  ADD COLUMN IF NOT EXISTS qualification_reasoning TEXT, -- AI reasoning for qualification decision
  ADD COLUMN IF NOT EXISTS call_session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL; -- Link to call session

-- Add index for querying by qualification score
CREATE INDEX IF NOT EXISTS idx_meetings_overall_qualification_score ON meetings(overall_qualification_score);
CREATE INDEX IF NOT EXISTS idx_meetings_criteria_met ON meetings USING GIN(criteria_met);
CREATE INDEX IF NOT EXISTS idx_meetings_call_session_id ON meetings(call_session_id);

-- Enhance call_sessions to link to meetings
ALTER TABLE call_sessions
  ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_call_sessions_meeting_id ON call_sessions(meeting_id);

-- Create function to calculate qualification status based on threshold
CREATE OR REPLACE FUNCTION calculate_qualification_status(
  overall_score DECIMAL,
  threshold DECIMAL DEFAULT 70.00
)
RETURNS TEXT AS $$
BEGIN
  IF overall_score IS NULL THEN
    RETURN 'pending';
  ELSIF overall_score >= threshold THEN
    RETURN 'qualified';
  ELSE
    RETURN 'not_qualified';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update meeting qualification from AI score
CREATE OR REPLACE FUNCTION update_meeting_qualification()
RETURNS TRIGGER AS $$
DECLARE
  campaign_threshold DECIMAL(5,2);
  calculated_status TEXT;
BEGIN
  -- Only process if ai_qualification_score is updated
  IF NEW.ai_qualification_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get campaign threshold
  SELECT COALESCE(c.qualification_threshold, 70.00)
  INTO campaign_threshold
  FROM campaigns c
  WHERE c.id = NEW.campaign_id;

  -- Extract scores from JSONB
  NEW.overall_qualification_score := (NEW.ai_qualification_score->>'overall_score')::DECIMAL;
  NEW.criteria_scores := NEW.ai_qualification_score->'criteria_scores';
  NEW.qualification_confidence := (NEW.ai_qualification_score->>'confidence')::DECIMAL;
  NEW.qualification_reasoning := NEW.ai_qualification_score->>'reasoning';

  -- Extract criteria_met and criteria_unmet arrays
  IF NEW.ai_qualification_score ? 'criteria_met' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.ai_qualification_score->'criteria_met'))
    INTO NEW.criteria_met;
  END IF;

  IF NEW.ai_qualification_score ? 'criteria_unmet' THEN
    SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.ai_qualification_score->'criteria_unmet'))
    INTO NEW.criteria_unmet;
  END IF;

  -- Calculate qualification status if not manually set
  IF NEW.status = 'pending' THEN
    calculated_status := calculate_qualification_status(NEW.overall_qualification_score, campaign_threshold);
    NEW.status := calculated_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update qualification when AI score is set
CREATE TRIGGER update_meeting_qualification_trigger
  BEFORE INSERT OR UPDATE OF ai_qualification_score ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_qualification();

-- Create view for qualification analytics
CREATE OR REPLACE VIEW qualification_analytics AS
SELECT
  c.id AS campaign_id,
  c.title AS campaign_title,
  c.qualification_threshold,
  COUNT(m.id) AS total_meetings,
  COUNT(m.id) FILTER (WHERE m.status = 'qualified') AS qualified_meetings,
  COUNT(m.id) FILTER (WHERE m.status = 'not_qualified') AS not_qualified_meetings,
  COUNT(m.id) FILTER (WHERE m.status = 'pending') AS pending_meetings,
  AVG(m.overall_qualification_score) FILTER (WHERE m.overall_qualification_score IS NOT NULL) AS avg_qualification_score,
  AVG(m.qualification_confidence) FILTER (WHERE m.qualification_confidence IS NOT NULL) AS avg_confidence,
  -- Count how often each criterion is met
  jsonb_object_agg(
    criterion,
    COUNT(*) FILTER (WHERE criterion = ANY(m.criteria_met))
  ) AS criteria_met_counts
FROM campaigns c
LEFT JOIN meetings m ON m.campaign_id = c.id
LEFT JOIN LATERAL jsonb_object_keys(c.meeting_criteria) AS criterion ON true
GROUP BY c.id, c.title, c.qualification_threshold;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.qualification_threshold IS 'Minimum overall score (0-100) required for a meeting to be considered qualified. Default: 70';
COMMENT ON COLUMN meetings.ai_qualification_score IS 'Full QualificationScore object from AI analysis including all scores, reasoning, quotes, etc.';
COMMENT ON COLUMN meetings.overall_qualification_score IS 'Overall qualification score (0-100) - denormalized for easy querying';
COMMENT ON COLUMN meetings.criteria_scores IS 'Individual scores for each company-defined criterion: {"criterion name": score}';
COMMENT ON COLUMN meetings.criteria_met IS 'Array of criteria names that were clearly met (score >= 70)';
COMMENT ON COLUMN meetings.criteria_unmet IS 'Array of criteria names that were not met (score < 70)';
COMMENT ON COLUMN meetings.qualification_confidence IS 'AI confidence level (0-1) in the qualification assessment';
COMMENT ON COLUMN meetings.qualification_reasoning IS 'AI explanation of why the meeting was/was not qualified';

-- Update RLS policies if needed (meetings table already has RLS)
-- No changes needed as we're just adding columns

