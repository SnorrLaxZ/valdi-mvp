'use client'

import { useState } from 'react'
import { FileText, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CallTranscriptProps {
  transcript: string
  aiHighlights?: {
    start: number
    end: number
    type: 'qualification' | 'issue' | 'positive'
    text: string
  }[]
  className?: string
}

export function CallTranscript({ transcript, aiHighlights = [], className = '' }: CallTranscriptProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'qualification':
        return 'bg-green-100 border-green-300'
      case 'issue':
        return 'bg-red-100 border-red-300'
      case 'positive':
        return 'bg-blue-100 border-blue-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const renderTranscript = () => {
    if (!aiHighlights.length) {
      return <p className="whitespace-pre-wrap text-sm text-gray-700">{transcript}</p>
    }

    // Simple highlight rendering - in production, you'd want more sophisticated text matching
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-wrap text-sm text-gray-700">{transcript}</p>
        {aiHighlights.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase">AI Highlights</h4>
            {aiHighlights.map((highlight, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getHighlightColor(highlight.type)}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-gray-700 capitalize">{highlight.type}</span>
                  <span className="text-xs text-gray-500">
                    {highlight.start}s - {highlight.end}s
                  </span>
                </div>
                <p className="text-sm text-gray-800 mt-1">{highlight.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Call Transcript</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-8"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {transcript ? (
          renderTranscript()
        ) : (
          <p className="text-sm text-gray-400 italic">No transcript available</p>
        )}
      </div>
    </div>
  )
}


