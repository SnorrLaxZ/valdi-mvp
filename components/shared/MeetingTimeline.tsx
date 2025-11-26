'use client'

import { Clock, User, Bot, Shield, Building2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface TimelineEvent {
  id: string
  timestamp: string
  actor: 'sdr' | 'ai' | 'admin' | 'client'
  action: string
  details?: string
  status?: 'approved' | 'rejected' | 'pending' | 'needs_revision'
}

interface MeetingTimelineProps {
  events: TimelineEvent[]
  className?: string
}

export function MeetingTimeline({ events, className = '' }: MeetingTimelineProps) {
  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'sdr':
        return <User className="h-4 w-4" />
      case 'ai':
        return <Bot className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'client':
        return <Building2 className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getActorColor = (actor: string) => {
    switch (actor) {
      case 'sdr':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'ai':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'admin':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'client':
        return 'bg-green-100 text-green-700 border-green-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'needs_revision':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Meeting Timeline</h3>
        <p className="text-xs text-gray-500 mt-1">Complete lifecycle: SDR → AI → Admin → Client</p>
      </div>
      <div className="p-4">
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No timeline events yet</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getActorColor(event.actor)}`}>
                    {getActorIcon(event.actor)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 capitalize">{event.actor}</span>
                          {event.status && getStatusIcon(event.status)}
                        </div>
                        <p className="text-sm text-gray-700">{event.action}</p>
                        {event.details && (
                          <p className="text-xs text-gray-500 mt-1">{event.details}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


