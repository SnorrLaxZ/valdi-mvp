-- Twilio & Stripe Integration Migration
-- Supports real-time calling, transcription, and marketplace payments

-- Twilio phone numbers assigned to SDRs
CREATE TABLE IF NOT EXISTS twilio_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_phone_sid TEXT UNIQUE, -- Twilio's phone number SID
  country_code TEXT NOT NULL CHECK (country_code IN ('SE', 'NO', 'DK', 'FI', 'IS')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time call sessions
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  twilio_call_sid TEXT UNIQUE NOT NULL,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  phone_number_from TEXT NOT NULL,
  phone_number_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  call_recording_id UUID REFERENCES call_recordings(id) ON DELETE SET NULL,
  real_time_transcription_enabled BOOLEAN DEFAULT true,
  qualification_score JSONB, -- Real-time qualification scores
  final_transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time transcription chunks
CREATE TABLE IF NOT EXISTS transcription_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  speaker TEXT CHECK (speaker IN ('sdr', 'prospect', 'unknown')), -- From diarization
  timestamp_ms INTEGER NOT NULL, -- Timestamp in milliseconds from call start
  confidence DECIMAL(5,2), -- Confidence score 0-1
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Connect accounts for SDRs
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL, -- Stripe Connect account ID
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'restricted', 'active')),
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_url TEXT, -- Stripe onboarding URL
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe payment intents (meeting payments)
CREATE TABLE IF NOT EXISTS stripe_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_charge_id TEXT,
  amount_total DECIMAL(10,2) NOT NULL, -- Total amount (e.g., €300)
  amount_sdr DECIMAL(10,2) NOT NULL, -- Amount to SDR (58% = €174)
  amount_platform DECIMAL(10,2) NOT NULL, -- Amount to platform (42% = €126)
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Connect payouts to SDRs
CREATE TABLE IF NOT EXISTS stripe_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
  stripe_payout_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  arrival_date TIMESTAMPTZ, -- When payout arrives in SDR's bank
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_twilio_phone_numbers_sdr_id ON twilio_phone_numbers(sdr_id);
CREATE INDEX IF NOT EXISTS idx_twilio_phone_numbers_country ON twilio_phone_numbers(country_code);
CREATE INDEX IF NOT EXISTS idx_call_sessions_sdr_id ON call_sessions(sdr_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_campaign_id ON call_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_twilio_sid ON call_sessions(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_transcription_chunks_call_session ON transcription_chunks(call_session_id);
CREATE INDEX IF NOT EXISTS idx_transcription_chunks_timestamp ON transcription_chunks(call_session_id, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_sdr_id ON stripe_connect_accounts(sdr_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_meeting_id ON stripe_payments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_sdr_id ON stripe_payments(sdr_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_sdr_id ON stripe_payouts(sdr_id);

-- Triggers for updated_at
CREATE TRIGGER update_twilio_phone_numbers_updated_at BEFORE UPDATE ON twilio_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_sessions_updated_at BEFORE UPDATE ON call_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at BEFORE UPDATE ON stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_payments_updated_at BEFORE UPDATE ON stripe_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE twilio_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payouts ENABLE ROW LEVEL SECURITY;

-- Twilio phone numbers policies
CREATE POLICY "SDRs can view their own phone numbers"
  ON twilio_phone_numbers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = twilio_phone_numbers.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all phone numbers"
  ON twilio_phone_numbers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Call sessions policies
CREATE POLICY "SDRs can view their own call sessions"
  ON call_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = call_sessions.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view call sessions for their campaigns"
  ON call_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN companies co ON co.id = c.company_id
      WHERE c.id = call_sessions.campaign_id AND co.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all call sessions"
  ON call_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Transcription chunks policies
CREATE POLICY "Users can view transcription chunks for accessible call sessions"
  ON transcription_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM call_sessions cs
      WHERE cs.id = transcription_chunks.call_session_id AND (
        EXISTS (
          SELECT 1 FROM sdrs s
          WHERE s.id = cs.sdr_id AND s.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM campaigns c
          JOIN companies co ON co.id = c.company_id
          WHERE c.id = cs.campaign_id AND co.user_id = auth.uid()
        )
      )
    )
  );

-- Stripe Connect accounts policies
CREATE POLICY "SDRs can view their own Stripe account"
  ON stripe_connect_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = stripe_connect_accounts.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all Stripe accounts"
  ON stripe_connect_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Stripe payments policies
CREATE POLICY "SDRs can view their own payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = stripe_payments.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view their own payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE id = stripe_payments.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Stripe payouts policies
CREATE POLICY "SDRs can view their own payouts"
  ON stripe_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sdrs
      WHERE id = stripe_payouts.sdr_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payouts"
  ON stripe_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

