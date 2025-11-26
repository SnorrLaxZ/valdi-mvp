/**
 * AI Qualification Engine
 * Uses GPT-4 to analyze call transcripts and score qualification
 */

// Optional OpenAI import - only load if package is installed
let OpenAI: any = null
let openai: any = null

try {
  OpenAI = require('openai').default || require('openai')
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (openaiApiKey && OpenAI) {
    openai = new OpenAI({ apiKey: openaiApiKey })
  } else {
    console.warn('OpenAI API key not configured - AI qualification features disabled')
  }
} catch (error) {
  console.warn('OpenAI package not installed - AI qualification features disabled')
}

/**
 * Dynamic qualification criteria based on company's campaign settings
 * Each company defines their own criteria array
 */
export interface QualificationCriteria {
  [criterion: string]: number // Dynamic criteria with scores 0-100
}

export interface QualificationScore {
  overall_score: number // 0-100 (average of all criteria scores)
  criteria_scores: QualificationCriteria // Scores for each company-defined criterion
  is_qualified: boolean // Based on company's qualification threshold
  confidence: number // 0-1
  reasoning: string
  key_quotes: string[] // Quotes that support qualification
  objections: string[] // Objections raised during call
  next_steps: string[] // Next steps discussed
  meeting_readiness: 'ready' | 'not_ready' | 'needs_follow_up'
  criteria_met: string[] // List of criteria that were clearly met
  criteria_unmet: string[] // List of criteria that were not met
}

/**
 * Parse meeting_criteria from campaign
 * Handles both JSON string and array formats
 */
function parseMeetingCriteria(meetingCriteria: any): string[] {
  if (Array.isArray(meetingCriteria)) {
    return meetingCriteria.filter(c => typeof c === 'string' && c.trim() !== '')
  }
  if (typeof meetingCriteria === 'string') {
    try {
      const parsed = JSON.parse(meetingCriteria)
      return Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string' && c.trim() !== '') : []
    } catch {
      return meetingCriteria.trim() !== '' ? [meetingCriteria] : []
    }
  }
  return []
}

/**
 * Analyze transcript and score qualification based on company's custom criteria
 */
export async function analyzeQualification(
  transcript: string,
  campaignCriteria: {
    icp_description: string
    meeting_criteria: any // Array of strings or JSON string
    qualification_threshold?: number // Campaign-specific threshold (defaults to 70)
  },
  qualificationThreshold?: number // Optional override threshold
): Promise<QualificationScore | null> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - API key required')
  }
  
  // Use campaign threshold if provided, otherwise default to 70
  const threshold = qualificationThreshold ?? campaignCriteria.qualification_threshold ?? 70
  try {
    // Parse company's custom criteria
    const criteriaList = parseMeetingCriteria(campaignCriteria.meeting_criteria)
    
    if (criteriaList.length === 0) {
      console.error('No qualification criteria found in campaign')
      return null
    }

    const prompt = buildQualificationPrompt(transcript, campaignCriteria, criteriaList)

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert B2B sales qualification analyst. Analyze sales call transcripts and score qualification based on the specific criteria provided by the company. Return a JSON object with scores for each criterion and overall analysis.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent scoring
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return null
    }

    const result = JSON.parse(content) as any

    // Build criteria_scores object from company's criteria
    const criteriaScores: QualificationCriteria = {}
    let totalScore = 0
    const criteriaMet: string[] = []
    const criteriaUnmet: string[] = []

    criteriaList.forEach((criterion, index) => {
      // Try to get score from AI response (it should return scores for each criterion)
      const scoreKey = `criterion_${index}_score` || criterion.toLowerCase().replace(/\s+/g, '_') + '_score'
      const score = result[scoreKey] || result.criteria_scores?.[criterion] || result[criterion] || 0
      const normalizedScore = Math.max(0, Math.min(100, Number(score)))
      
      criteriaScores[criterion] = normalizedScore
      totalScore += normalizedScore

      // Track which criteria were met (score >= 70)
      if (normalizedScore >= 70) {
        criteriaMet.push(criterion)
      } else {
        criteriaUnmet.push(criterion)
      }
    })

    // Calculate overall score as average of all criteria scores
    const overallScore = criteriaList.length > 0 ? totalScore / criteriaList.length : 0

    const qualificationScore: QualificationScore = {
      overall_score: Math.round(overallScore),
      criteria_scores: criteriaScores,
      is_qualified: overallScore >= threshold,
      confidence: result.confidence || 0.8,
      reasoning: result.reasoning || '',
      key_quotes: result.key_quotes || [],
      objections: result.objections || [],
      next_steps: result.next_steps || [],
      meeting_readiness: result.meeting_readiness || (overallScore >= threshold ? 'ready' : 'not_ready'),
      criteria_met: criteriaMet,
      criteria_unmet: criteriaUnmet,
    }

    return qualificationScore
  } catch (error: any) {
    console.error('Error analyzing qualification:', error)
    return null
  }
}

/**
 * Real-time qualification analysis (for streaming transcripts)
 */
export async function analyzeQualificationChunk(
  transcriptChunk: string,
  previousContext: string = '',
  campaignCriteria: {
    icp_description: string
    meeting_criteria: any
    qualification_threshold?: number
  },
  qualificationThreshold?: number
): Promise<Partial<QualificationScore> | null> {
  try {
    const fullTranscript = previousContext + '\n' + transcriptChunk
    return await analyzeQualification(fullTranscript, campaignCriteria, qualificationThreshold)
  } catch (error: any) {
    console.error('Error analyzing qualification chunk:', error)
    return null
  }
}

/**
 * Build qualification prompt using company's custom criteria
 */
function buildQualificationPrompt(
  transcript: string,
  campaignCriteria: {
    icp_description: string
    meeting_criteria: any
  },
  criteriaList: string[]
): string {
  // Build criteria scoring instructions dynamically
  const criteriaInstructions = criteriaList.map((criterion, index) => {
    return `- ${criterion}: Score 0-100 based on whether this criterion was clearly met in the conversation. Use criterion_${index}_score as the key.`
  }).join('\n')

  return `Analyze this sales call transcript and provide a qualification score based on the company's specific criteria.

Campaign ICP: ${campaignCriteria.icp_description}

Company's Qualification Criteria (score each one 0-100):
${criteriaList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Call Transcript:
${transcript}

Return a JSON object with this structure:
{
  ${criteriaList.map((c, i) => `"criterion_${i}_score": <0-100>, // Score for: ${c}`).join('\n  ')}
  "confidence": <0-1>,
  "reasoning": "<explanation of how each criterion was evaluated>",
  "key_quotes": ["<quote1>", "<quote2>"], // Quotes that support qualification
  "objections": ["<objection1>", "<objection2>"], // Objections raised
  "next_steps": ["<step1>", "<step2>"], // Next steps discussed
  "meeting_readiness": "<ready|not_ready|needs_follow_up>"
}

Scoring Guidelines:
${criteriaInstructions}

For each criterion:
- Score 80-100: Criterion was clearly and explicitly met
- Score 50-79: Criterion was partially met or implied
- Score 20-49: Criterion was mentioned but not confirmed
- Score 0-19: Criterion was not addressed or explicitly not met

Be strict but fair. Only score highly if criteria are clearly met with evidence from the transcript.`
}

/**
 * Extract meeting details from transcript
 */
export async function extractMeetingDetails(transcript: string): Promise<{
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  meeting_date?: string
  meeting_time?: string
  notes?: string
} | null> {
  if (!openai) {
    throw new Error('OpenAI client not initialized - API key required')
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract meeting details from sales call transcript. Return JSON only.',
        },
        {
          role: 'user',
          content: `Extract meeting details from this transcript:\n\n${transcript}\n\nReturn JSON: {contact_name?, contact_email?, contact_phone?, meeting_date?, meeting_time?, notes?}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    return JSON.parse(content)
  } catch (error: any) {
    console.error('Error extracting meeting details:', error)
    return null
  }
}

