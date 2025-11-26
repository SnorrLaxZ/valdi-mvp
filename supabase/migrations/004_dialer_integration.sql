-- Dialer Integration Migration
-- Supports multiple dialer providers (Aircall, RingCentral, Twilio, etc.)

-- Dialer Integrations table (stores SDR dialer account connections)
CREATE TABLE IF NOT EXISTS dialer_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  dialer_provider TEXT NOT NULL CHECK (dialer_provider IN ('aircall', 'ringcentral', 'twilio', 'justcall', 'kixie', 'other')),
  provider_account_id TEXT NOT NULL, -- External dialer account/user ID
  provider_phone_number TEXT, -- The phone number used in dialer
  access_token_encrypted TEXT, -- Encrypted access token (if needed)
  refresh_token_encrypted TEXT, -- Encrypted refresh token (if needed)
  webhook_secret TEXT, -- Secret for validating webhooks
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB, -- Provider-specific settings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sdr_id, dialer_provider, provider_account_id)
);

-- Add call_recording_id to outreach_attempts for linking
ALTER TABLE outreach_attempts 
  ADD COLUMN IF NOT EXISTS call_recording_id UUID REFERENCES call_recordings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dialer_call_id TEXT, -- External dialer call ID
  ADD COLUMN IF NOT EXISTS dialer_integration_id UUID REFERENCES dialer_integrations(id) ON DELETE SET NULL;

-- Add dialer_call_id to call_recordings for tracking
ALTER TABLE call_recordings
  ADD COLUMN IF NOT EXISTS dialer_call_id TEXT, -- External dialer call ID
  ADD COLUMN IF NOT EXISTS dialer_integration_id UUID REFERENCES dialer_integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_deleted_at TIMESTAMPTZ; -- For GDPR 30-day retention

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dialer_integrations_sdr_id ON dialer_integrations(sdr_id);
CREATE INDEX IF NOT EXISTS idx_dialer_integrations_provider ON dialer_integrations(dialer_provider);
CREATE INDEX IF NOT EXISTS idx_outreach_attempts_call_recording_id ON outreach_attempts(call_recording_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_dialer_call_id ON call_recordings(dialer_call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_auto_deleted_at ON call_recordings(auto_deleted_at);

-- Function to automatically set auto_deleted_at (30 days from upload)
CREATE OR REPLACE FUNCTION set_call_recording_retention()
RETURNS TRIGGER AS $$
BEGIN
  -- Set auto_deleted_at to 30 days from now (GDPR compliance)
  NEW.auto_deleted_at := NOW() + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set retention date on insert
CREATE TRIGGER set_call_recording_retention_trigger
  BEFORE INSERT ON call_recordings
  FOR EACH ROW
  WHEN (NEW.auto_deleted_at IS NULL)
  EXECUTE FUNCTION set_call_recording_retention();

-- Function to delete expired recordings (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_recordings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  expired_recordings RECORD;
BEGIN
  deleted_count := 0;
  
  -- Find recordings that should be deleted
  FOR expired_recordings IN
    SELECT id, storage_path
    FROM call_recordings
    WHERE auto_deleted_at IS NOT NULL
      AND auto_deleted_at <= NOW()
      AND storage_path IS NOT NULL
  LOOP
    -- Delete from storage (this would be handled by application code)
    -- For now, we just mark them as deleted
    UPDATE call_recordings
    SET storage_path = NULL,
        file_name = '[DELETED - GDPR]',
        transcription = NULL
    WHERE id = expired_recordings.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for dialer_integrations
ALTER TABLE dialer_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SDRs can view their own dialer integrations"
  ON dialer_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = dialer_integrations.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "SDRs can manage their own dialer integrations"
  ON dialer_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = dialer_integrations.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all dialer integrations"
  ON dialer_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Update updated_at trigger for dialer_integrations
CREATE TRIGGER update_dialer_integrations_updated_at BEFORE UPDATE ON dialer_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

