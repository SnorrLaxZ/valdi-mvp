-- Company/Prospect Criteria Enhancement
-- Distinguishes between company-level criteria (ICP) and call-level criteria (qualification)

-- Enhance campaigns table to separate company criteria from call criteria
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS company_criteria JSONB, -- Company/Prospect level criteria (revenue, employees, industry, etc.)
  ADD COLUMN IF NOT EXISTS call_criteria JSONB; -- Call/Conversation level criteria (budget confirmed, decision maker, etc.)

-- Rename meeting_criteria to call_criteria for clarity (backward compatible)
-- Keep meeting_criteria for now, but populate call_criteria from it
UPDATE campaigns
SET call_criteria = meeting_criteria
WHERE call_criteria IS NULL AND meeting_criteria IS NOT NULL;

-- Add comment explaining the distinction
COMMENT ON COLUMN campaigns.company_criteria IS 'Company/Prospect level qualification criteria (e.g., revenue >= 10M NOK, employees >= 100, industry = hospitality). These are checked against lead/company data.';
COMMENT ON COLUMN campaigns.call_criteria IS 'Call/Conversation level qualification criteria (e.g., budget confirmed, decision maker identified, timeline established). These are checked via AI analysis of call transcripts.';
COMMENT ON COLUMN campaigns.meeting_criteria IS 'DEPRECATED: Use call_criteria instead. Kept for backward compatibility.';

-- Add company criteria matching fields to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company_revenue DECIMAL(12,2), -- Annual revenue
  ADD COLUMN IF NOT EXISTS company_employees INTEGER, -- Number of employees
  ADD COLUMN IF NOT EXISTS company_industry TEXT, -- Industry type
  ADD COLUMN IF NOT EXISTS company_criteria_match JSONB, -- Which company criteria were matched
  ADD COLUMN IF NOT EXISTS company_criteria_score DECIMAL(5,2), -- Overall company criteria match score (0-100)
  ADD COLUMN IF NOT EXISTS all_company_criteria_met BOOLEAN DEFAULT false; -- True if all company criteria are met

-- Add indexes for company criteria queries
CREATE INDEX IF NOT EXISTS idx_leads_company_revenue ON leads(company_revenue);
CREATE INDEX IF NOT EXISTS idx_leads_company_employees ON leads(company_employees);
CREATE INDEX IF NOT EXISTS idx_leads_company_industry ON leads(company_industry);
CREATE INDEX IF NOT EXISTS idx_leads_company_criteria_met ON leads(all_company_criteria_met);

-- Function to evaluate company criteria match
CREATE OR REPLACE FUNCTION evaluate_company_criteria(
  criteria JSONB,
  lead_revenue DECIMAL,
  lead_employees INTEGER,
  lead_industry TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  criterion TEXT;
  criterion_value JSONB;
  matched BOOLEAN;
  score DECIMAL(5,2) := 0;
  total_criteria INTEGER := 0;
  matched_criteria INTEGER := 0;
BEGIN
  -- If no criteria, return empty result
  IF criteria IS NULL OR jsonb_typeof(criteria) != 'object' THEN
    RETURN jsonb_build_object(
      'matched_criteria', '{}'::JSONB,
      'unmatched_criteria', '{}'::JSONB,
      'score', 0,
      'all_met', false
    );
  END IF;

  -- Evaluate each criterion
  FOR criterion, criterion_value IN SELECT * FROM jsonb_each(criteria)
  LOOP
    total_criteria := total_criteria + 1;
    matched := false;

    -- Check revenue criteria
    IF criterion ILIKE '%revenue%' OR criterion ILIKE '%omsättning%' THEN
      IF criterion_value ? 'min' THEN
        matched := lead_revenue >= (criterion_value->>'min')::DECIMAL;
      ELSIF criterion_value ? 'max' THEN
        matched := lead_revenue <= (criterion_value->>'max')::DECIMAL;
      ELSIF criterion_value ? 'equals' THEN
        matched := lead_revenue = (criterion_value->>'equals')::DECIMAL;
      END IF;
    END IF;

    -- Check employees criteria
    IF criterion ILIKE '%employee%' OR criterion ILIKE '%anställd%' THEN
      IF criterion_value ? 'min' THEN
        matched := lead_employees >= (criterion_value->>'min')::INTEGER;
      ELSIF criterion_value ? 'max' THEN
        matched := lead_employees <= (criterion_value->>'max')::INTEGER;
      ELSIF criterion_value ? 'equals' THEN
        matched := lead_employees = (criterion_value->>'equals')::INTEGER;
      END IF;
    END IF;

    -- Check industry criteria
    IF criterion ILIKE '%industry%' OR criterion ILIKE '%bransch%' THEN
      IF jsonb_typeof(criterion_value) = 'array' THEN
        -- Array of allowed industries
        matched := lead_industry = ANY(SELECT jsonb_array_elements_text(criterion_value));
      ELSIF jsonb_typeof(criterion_value) = 'string' THEN
        matched := lead_industry ILIKE '%' || (criterion_value #>> '{}') || '%';
      END IF;
    END IF;

    -- Store match result
    IF matched THEN
      result := result || jsonb_build_object(criterion, true);
      matched_criteria := matched_criteria + 1;
    ELSE
      result := result || jsonb_build_object(criterion, false);
    END IF;
  END LOOP;

  -- Calculate score
  IF total_criteria > 0 THEN
    score := (matched_criteria::DECIMAL / total_criteria::DECIMAL) * 100;
  END IF;

  RETURN jsonb_build_object(
    'matched_criteria', result,
    'score', score,
    'all_met', matched_criteria = total_criteria AND total_criteria > 0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-evaluate company criteria when lead is created/updated
CREATE OR REPLACE FUNCTION update_lead_company_criteria()
RETURNS TRIGGER AS $$
DECLARE
  campaign_criteria JSONB;
  evaluation_result JSONB;
BEGIN
  -- Get campaign company criteria
  SELECT c.company_criteria INTO campaign_criteria
  FROM campaigns c
  WHERE c.id = NEW.campaign_id;

  -- Evaluate if criteria exists
  IF campaign_criteria IS NOT NULL THEN
    evaluation_result := evaluate_company_criteria(
      campaign_criteria,
      NEW.company_revenue,
      NEW.company_employees,
      NEW.company_industry
    );

    -- Update lead with evaluation results
    NEW.company_criteria_match := evaluation_result->'matched_criteria';
    NEW.company_criteria_score := (evaluation_result->>'score')::DECIMAL;
    NEW.all_company_criteria_met := (evaluation_result->>'all_met')::BOOLEAN;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-evaluate company criteria
CREATE TRIGGER update_lead_company_criteria_trigger
  BEFORE INSERT OR UPDATE OF company_revenue, company_employees, company_industry, campaign_id ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_company_criteria();

-- Create view for company criteria analytics
CREATE OR REPLACE VIEW company_criteria_analytics AS
SELECT
  c.id AS campaign_id,
  c.title AS campaign_title,
  COUNT(l.id) AS total_leads,
  COUNT(l.id) FILTER (WHERE l.all_company_criteria_met = true) AS qualified_leads,
  AVG(l.company_criteria_score) FILTER (WHERE l.company_criteria_score IS NOT NULL) AS avg_criteria_score,
  -- Breakdown by criteria type
  COUNT(l.id) FILTER (WHERE l.company_revenue IS NOT NULL) AS leads_with_revenue,
  COUNT(l.id) FILTER (WHERE l.company_employees IS NOT NULL) AS leads_with_employees,
  COUNT(l.id) FILTER (WHERE l.company_industry IS NOT NULL) AS leads_with_industry
FROM campaigns c
LEFT JOIN leads l ON l.campaign_id = c.id
GROUP BY c.id, c.title;

