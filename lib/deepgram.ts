/**
 * Deepgram Real-Time Transcription Service
 * Handles real-time audio transcription from Twilio Media Streams
 */

// Deepgram SDK is optional - only load if available
let deepgram: any = null
let createClient: any = null

try {
  const deepgramModule = require('@deepgram/sdk')
  createClient = deepgramModule.createClient || deepgramModule.default?.createClient
  
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY
  if (deepgramApiKey && createClient) {
    deepgram = createClient(deepgramApiKey)
  } else {
    console.warn('Deepgram API key not configured - transcription features will be disabled')
  }
} catch (error) {
  console.warn('Deepgram SDK not installed - transcription features will be disabled')
}

export interface TranscriptionConfig {
  language?: 'sv' | 'no' | 'en' // Swedish, Norwegian, English
  model?: 'nova-2' | 'enhanced' // Nova-2 is latest, best for real-time
  punctuate?: boolean
  diarize?: boolean // Speaker diarization (identify SDR vs prospect)
  smart_format?: boolean
  interim_results?: boolean // Get partial results as they come
}

/**
 * Create real-time transcription connection
 * Returns WebSocket URL for Twilio Media Streams
 */
export async function createTranscriptionConnection(
  config: TranscriptionConfig = {}
): Promise<{ url: string; token: string } | null> {
  if (!deepgram) {
    console.warn('Deepgram client not initialized')
    return null
  }
  
  try {
    const {
      result: { key },
    } = await deepgram.keys.create({
      project: process.env.DEEPGRAM_PROJECT_ID || '',
      comment: 'Valdi real-time transcription',
      scopes: ['usage:write'],
      timeToLive: 3600, // 1 hour
    })

    if (!key) {
      throw new Error('Failed to create Deepgram key')
    }

    // Build WebSocket URL
    const wsUrl = `wss://api.deepgram.com/v1/listen?` +
      `language=${config.language || 'sv'}&` +
      `model=${config.model || 'nova-2'}&` +
      `punctuate=${config.punctuate !== false}&` +
      `diarize=${config.diarize !== false}&` +
      `smart_format=${config.smart_format !== false}&` +
      `interim_results=${config.interim_results !== false}`

    return {
      url: wsUrl,
      token: key,
    }
  } catch (error: any) {
    console.error('Error creating Deepgram connection:', error)
    return null
  }
}

/**
 * Process transcription result
 */
export interface TranscriptionResult {
  transcript: string
  confidence: number
  speaker?: string // 'sdr' or 'prospect' if diarization enabled
  is_final: boolean
  start: number
  end: number
}

export function parseTranscriptionResult(data: any): TranscriptionResult | null {
  try {
    const channel = data.channel
    if (!channel || !channel.alternatives || channel.alternatives.length === 0) {
      return null
    }

    const alternative = channel.alternatives[0]
    const words = alternative.words || []

    return {
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0,
      speaker: channel.alternatives[0].words?.[0]?.speaker?.toString() || undefined,
      is_final: data.is_final || false,
      start: words[0]?.start || 0,
      end: words[words.length - 1]?.end || 0,
    }
  } catch (error) {
    console.error('Error parsing transcription result:', error)
    return null
  }
}

/**
 * Batch transcription (for post-call processing)
 */
export async function transcribeAudioFile(
  audioUrl: string,
  language: 'sv' | 'no' | 'en' = 'sv'
): Promise<string | null> {
  if (!deepgram) {
    console.warn('Deepgram client not initialized')
    return null
  }
  
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      audioUrl,
      {
        model: 'nova-2',
        language,
        punctuate: true,
        diarize: true,
        smart_format: true,
      }
    )

    if (error) {
      console.error('Deepgram transcription error:', error)
      return null
    }

    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || null
  } catch (error: any) {
    console.error('Error transcribing audio file:', error)
    return null
  }
}

/**
 * Get transcription cost estimate
 */
export function estimateTranscriptionCost(durationMinutes: number): number {
  // Deepgram pricing: $0.0043 per minute for real-time
  return durationMinutes * 0.0043
}

