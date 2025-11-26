# Twilio + Stripe Integration Plan
## Glencoco-Style Quality for Nordic Markets (Norway/Sweden)

## Executive Summary

**Recommended Stack:**
- **Twilio** - Voice infrastructure with Media Streams (real-time audio)
- **Deepgram** or **OpenAI Whisper** - Real-time AI transcription
- **OpenAI GPT-4** - Qualification analysis & scoring
- **Stripe Connect** - Marketplace payments with commission splits

**Why This Stack:**
1. ✅ Twilio supports Sweden numbers natively, Norway via SIP trunking
2. ✅ Media Streams enables real-time transcription (Glencoco-style)
3. ✅ Deepgram has 99%+ accuracy and <300ms latency
4. ✅ Stripe Connect handles marketplace commission splits automatically
5. ✅ GDPR-compliant with Nordic data residency options

---

## Architecture Overview

```
SDR → Twilio Voice → Media Streams → Deepgram (transcription)
                                    ↓
                              OpenAI GPT-4 (qualification)
                                    ↓
                              Valdi Database
                                    ↓
                              Stripe Connect (payment)
```

---

## 1. Twilio Setup

### Phone Numbers
- **Sweden**: ✅ Native support via Twilio
- **Norway**: ✅ Via SIP Trunking (Twilio supports this)
- **Number Masking**: Use Twilio's number masking for privacy

### Key Features Needed:
1. **Media Streams** - Real-time audio streaming for transcription
2. **Call Recording** - Backup recordings (GDPR 30-day retention)
3. **Number Provisioning** - Auto-provision Swedish numbers for SDRs
4. **Call Control** - Programmable voice for dialer interface

### Implementation:
```typescript
// Twilio Media Streams WebSocket connection
// Streams audio to Deepgram in real-time
// Enables <1 second transcription latency
```

---

## 2. AI Transcription (Deepgram vs OpenAI Whisper)

### **Recommendation: Deepgram**

**Why Deepgram:**
- ⚡ **<300ms latency** (vs Whisper's 2-5 seconds)
- 🎯 **99%+ accuracy** for Norwegian/Swedish
- 💰 **$0.0043/min** (very affordable)
- 🌍 **Real-time streaming** API
- 📊 **Speaker diarization** (identifies SDR vs prospect)

**OpenAI Whisper Alternative:**
- ✅ Better for batch processing
- ❌ Higher latency (2-5 seconds)
- ❌ More expensive for real-time

### Implementation:
```typescript
// Deepgram real-time streaming
// Connects to Twilio Media Streams
// Returns transcription chunks as they happen
// Enables real-time qualification scoring
```

---

## 3. Qualification Engine

### Real-Time Qualification Flow:
1. **Call starts** → Twilio Media Streams opens
2. **Audio streams** → Deepgram transcribes in real-time
3. **Transcript chunks** → GPT-4 analyzes qualification criteria
4. **Score updates** → Dashboard shows live qualification status
5. **Call ends** → Final qualification score + meeting recommendation

### Qualification Criteria (from campaign):
**Dynamic - Each company defines their own criteria**
- Companies set custom qualification criteria when creating campaigns
- Examples: "Budget confirmed", "Decision maker identified", "Timeline Q1 2025", etc.
- AI scores each criterion individually (0-100)
- Overall qualification based on average score meeting company's threshold

### GPT-4 Prompt:
```
Analyze this sales call transcript and score qualification based on company's custom criteria:
- [Company Criterion 1]: [0-100]
- [Company Criterion 2]: [0-100]
- [Company Criterion 3]: [0-100]
... (dynamically generated based on campaign.meeting_criteria)

Extract: key quotes, objections, next steps, meeting readiness
Each criterion is scored individually, then averaged for overall score
```

---

## 4. Stripe Connect Marketplace

### Why Stripe Connect:
- ✅ **Automatic commission splits** (58% SDR, 42% Valdi)
- ✅ **Onboarding** - SDRs connect Stripe accounts
- ✅ **Compliance** - Handles tax, KYC automatically
- ✅ **Payouts** - Automatic transfers to SDRs
- ✅ **Disputes** - Built-in dispute handling

### Flow:
1. **Company pays** → Stripe charges company €300/meeting
2. **Stripe splits** → €174 to SDR, €126 to Valdi (automatic)
3. **SDR receives** → Funds in their Stripe account
4. **Payout** → SDR withdraws to bank (handled by Stripe)

### Setup:
- Stripe Connect Express accounts for SDRs
- Stripe Connect Standard for companies
- Application fees: 42% commission

---

## 5. Database Schema Updates

### New Tables Needed:
```sql
-- Twilio phone numbers assigned to SDRs
CREATE TABLE twilio_phone_numbers (
  id UUID PRIMARY KEY,
  sdr_id UUID REFERENCES sdrs(id),
  phone_number TEXT UNIQUE,
  country_code TEXT, -- 'SE' or 'NO'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time call sessions
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY,
  twilio_call_sid TEXT UNIQUE,
  sdr_id UUID REFERENCES sdrs(id),
  campaign_id UUID REFERENCES campaigns(id),
  lead_id UUID REFERENCES leads(id),
  phone_number_from TEXT,
  phone_number_to TEXT,
  status TEXT, -- 'ringing', 'in-progress', 'completed'
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  real_time_transcription_id UUID,
  qualification_score JSONB, -- Real-time scores
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time transcription chunks
CREATE TABLE transcription_chunks (
  id UUID PRIMARY KEY,
  call_session_id UUID REFERENCES call_sessions(id),
  chunk_text TEXT,
  speaker TEXT, -- 'sdr' or 'prospect'
  timestamp_ms INTEGER,
  confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe Connect accounts
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY,
  sdr_id UUID REFERENCES sdrs(id),
  stripe_account_id TEXT UNIQUE,
  account_status TEXT, -- 'pending', 'active', 'restricted'
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe payment intents (meeting payments)
CREATE TABLE stripe_payments (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id),
  company_id UUID REFERENCES companies(id),
  sdr_id UUID REFERENCES sdrs(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount_total DECIMAL(10,2), -- €300
  amount_sdr DECIMAL(10,2), -- €174 (58%)
  amount_platform DECIMAL(10,2), -- €126 (42%)
  status TEXT, -- 'pending', 'succeeded', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Implementation Phases

### Phase 1: Twilio Voice Integration (Week 1-2)
- [ ] Set up Twilio account
- [ ] Provision Swedish phone numbers
- [ ] Build Media Streams WebSocket handler
- [ ] Create SDR dialer interface
- [ ] Test call quality in Sweden/Norway

### Phase 2: Real-Time Transcription (Week 2-3)
- [ ] Set up Deepgram account
- [ ] Connect Media Streams → Deepgram
- [ ] Store transcription chunks
- [ ] Build real-time transcript viewer
- [ ] Test accuracy for Swedish/Norwegian

### Phase 3: AI Qualification (Week 3-4)
- [ ] Build GPT-4 qualification prompt
- [ ] Real-time scoring engine
- [ ] Qualification dashboard
- [ ] Meeting recommendation logic
- [ ] Test qualification accuracy

### Phase 4: Stripe Connect (Week 4-5)
- [ ] Set up Stripe Connect
- [ ] SDR onboarding flow
- [ ] Payment intent creation
- [ ] Commission split logic
- [ ] Payout testing

### Phase 5: Integration & Polish (Week 5-6)
- [ ] End-to-end testing
- [ ] GDPR compliance checks
- [ ] Performance optimization
- [ ] Error handling
- [ ] Documentation

---

## 7. Cost Estimates

### Twilio:
- Swedish number: $1.00/month
- Outbound calls: $0.013/min (Sweden), $0.020/min (Norway)
- Media Streams: $0.0015/min
- **Estimated: $50-100/month per SDR** (assuming 1000 min/month)

### Deepgram:
- Real-time transcription: $0.0043/min
- **Estimated: $4.30/month per SDR** (1000 min/month)

### OpenAI:
- GPT-4 qualification: ~$0.03 per call (1000 tokens)
- **Estimated: $3/month per SDR** (100 calls/month)

### Stripe:
- 2.9% + €0.25 per transaction
- **Estimated: €9.25 per meeting** (on €300)

### **Total Platform Cost: ~€15-20 per SDR/month**
### **Revenue per Meeting: €126 (42% commission)**

---

## 8. GDPR Compliance

### Data Handling:
- ✅ Call recordings: 30-day auto-deletion
- ✅ Transcripts: Stored encrypted, 30-day retention
- ✅ Phone numbers: Encrypted storage
- ✅ Stripe data: Handled by Stripe (GDPR compliant)

### Nordic Data Residency:
- ✅ Deepgram: EU data centers available
- ✅ Twilio: EU data centers
- ✅ Supabase: EU data centers
- ✅ OpenAI: Can request EU processing

---

## 9. Glencoco-Style Quality Features

### Real-Time Features:
1. **Live Transcript** - See conversation as it happens
2. **Qualification Score** - Updates in real-time
3. **AI Coaching** - Suggests next questions
4. **Objection Handling** - Real-time suggestions
5. **Meeting Detection** - Auto-detects when meeting is booked

### Post-Call Features:
1. **Call Summary** - AI-generated summary
2. **Qualification Report** - Detailed scoring breakdown
3. **Next Steps** - Extracted action items
4. **Meeting Confirmation** - Auto-creates meeting record

---

## 10. Technical Implementation

### Key Files to Create:

1. **`lib/twilio.ts`** - Twilio client & Media Streams handler
2. **`lib/deepgram.ts`** - Deepgram real-time transcription
3. **`lib/qualification.ts`** - GPT-4 qualification engine
4. **`lib/stripe-connect.ts`** - Stripe Connect marketplace logic
5. **`app/api/twilio/voice/route.ts`** - Twilio webhook handler
6. **`app/api/twilio/media-streams/route.ts`** - Media Streams WebSocket
7. **`app/api/stripe/webhook/route.ts`** - Stripe webhook handler
8. **`app/sdr/dialer/page.tsx`** - SDR dialer interface
9. **`components/call/RealTimeTranscript.tsx`** - Live transcript viewer
10. **`components/call/QualificationScore.tsx`** - Real-time scoring

---

## 11. Next Steps

1. **Get Twilio account** - Sign up, verify identity
2. **Get Deepgram API key** - Sign up for real-time transcription
3. **Get OpenAI API key** - For GPT-4 qualification
4. **Set up Stripe Connect** - Create Connect application
5. **Provision test numbers** - Get Swedish numbers for testing
6. **Build Phase 1** - Twilio voice integration
7. **Test call quality** - Verify Sweden/Norway connectivity
8. **Iterate** - Build remaining phases

---

## 12. Alternative Considerations

### If Twilio Norway is problematic:
- **Option A**: Use Norwegian VoIP provider (Telenor, Telia)
- **Option B**: Use SIP trunking (Twilio supports this)
- **Option C**: Focus on Sweden first, expand Norway later

### If Deepgram is too expensive:
- **Option A**: Use OpenAI Whisper API (batch processing)
- **Option B**: Use AssemblyAI (similar to Deepgram, cheaper)
- **Option C**: Self-host Whisper (more complex)

### If Stripe Connect is complex:
- **Option A**: Manual payouts (simpler, less scalable)
- **Option B**: Use Stripe Connect Express (recommended)
- **Option C**: Use third-party payment processor

---

## Conclusion

**Recommended Path Forward:**
1. ✅ Start with Twilio + Deepgram + OpenAI + Stripe Connect
2. ✅ Focus on Sweden first (easier Twilio support)
3. ✅ Build real-time transcription + qualification
4. ✅ Add Stripe Connect for payments
5. ✅ Expand to Norway once Sweden is proven

This stack gives you **Glencoco-style quality** with:
- Real-time transcription (<300ms latency)
- AI-powered qualification
- Automatic commission splits
- Nordic phone number support
- GDPR compliance

**Estimated Timeline: 5-6 weeks**
**Estimated Cost: €15-20/SDR/month**
**Revenue per Meeting: €126 (42% commission)**

