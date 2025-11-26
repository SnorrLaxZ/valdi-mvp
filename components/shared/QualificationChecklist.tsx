'use client'

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

interface QualificationChecklistProps {
  criteria: string[]
  checklist: boolean[]
  readOnly?: boolean
  onChange?: (index: number, checked: boolean) => void
  className?: string
}

export function QualificationChecklist({
  criteria,
  checklist,
  readOnly = false,
  onChange,
  className = ''
}: QualificationChecklistProps) {
  const handleToggle = (index: number) => {
    if (readOnly || !onChange) return
    onChange(index, !checklist[index])
  }

  const allChecked = checklist.length > 0 && checklist.every(item => item === true)
  const checkedCount = checklist.filter(item => item === true).length

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Qualification Checklist</h3>
          <span className="text-xs text-gray-500">
            {checkedCount} / {criteria.length} met
          </span>
        </div>
      </div>
      <div className="p-4">
        {criteria.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No qualification criteria defined</p>
        ) : (
          <div className="space-y-3">
            {criteria.map((criterion, index) => {
              const isChecked = checklist[index] === true
              return (
                <div
                  key={index}
                  onClick={() => handleToggle(index)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                    readOnly
                      ? 'cursor-default'
                      : 'cursor-pointer hover:bg-gray-50'
                  } ${
                    isChecked
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isChecked ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}>
                      {criterion}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {criteria.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className={`flex items-center gap-2 text-sm ${
              allChecked ? 'text-green-700' : 'text-gray-600'
            }`}>
              {allChecked ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">All qualification criteria met</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>Some qualification criteria not met</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


