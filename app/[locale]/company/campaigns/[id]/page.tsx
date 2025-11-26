'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useCampaign } from '@/lib/hooks/useCampaign'
import { SidebarLayout } from '@/components/layouts/SidebarLayout'
import { MeetingTimeline } from '@/components/shared'
import type { Lead, Meeting, CampaignApplication, QualificationRule } from '@/lib/supabase'

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const t = useTranslations()
  const locale = useLocale()
  const campaignId = params.id as string
  const { campaign, loading, error } = useCampaign(campaignId)
  const [companyName, setCompanyName] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'meetings' | 'sdrs' | 'disputes'>('overview')
  const [qualificationRules, setQualificationRules] = useState<QualificationRule[]>([])

  useEffect(() => {
    loadCompanyName()
    if (campaignId) {
      loadQualificationRules()
    }
  }, [campaignId])

  const loadCompanyName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('user_id', user.id)
        .single()

      if (company) setCompanyName(company.company_name)
    } catch (error) {
      console.error('Error loading company:', error)
    }
  }

  const loadQualificationRules = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules`)
      const data = await response.json()
      if (data.rules) {
        setQualificationRules(data.rules)
      }
    } catch (error) {
      console.error('Error loading qualification rules:', error)
    }
  }

  const navItems = [
    { href: '/company/dashboard', label: 'Dashboard' },
    { href: '/company/campaigns', label: 'Kampanjer' },
    { href: '/company/meetings', label: 'Möten' },
    { href: '/company/disputes', label: 'Disputes' },
    { href: '/company/leads', label: 'Leads' },
  ]

  if (loading) {
    return (
      <SidebarLayout
        title="Campaign"
        subtitle={companyName}
        navItems={navItems}
        activePath="/company/campaigns"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Laddar...</div>
        </div>
      </SidebarLayout>
    )
  }

  if (error || !campaign) {
    return (
      <SidebarLayout
        title="Campaign"
        subtitle={companyName}
        navItems={navItems}
        activePath="/company/campaigns"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-400">Error loading campaign</div>
        </div>
      </SidebarLayout>
    )
  }

  const getQualificationCriteria = (meetingCriteria: string | string[]): string[] => {
    if (Array.isArray(meetingCriteria)) {
      return meetingCriteria
    }
    try {
      return JSON.parse(meetingCriteria)
    } catch {
      return [meetingCriteria]
    }
  }

  const criteria = getQualificationCriteria(campaign.meeting_criteria)

  return (
    <SidebarLayout
      title="Campaign"
      subtitle={companyName}
      navItems={navItems}
      activePath="/company/campaigns"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{campaign.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Campaign Details</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              campaign.status === 'active' ? 'bg-green-100 text-green-700' :
              campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
              campaign.status === 'completed' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {campaign.status}
            </span>
            <Link
              href={`/company/campaigns/${campaignId}/rules`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Edit Rules
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(['overview', 'leads', 'meetings', 'sdrs', 'disputes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' ? 'Overview' :
               tab === 'leads' ? `Leads (${campaign.leads?.length || 0})` :
               tab === 'meetings' ? `Meetings (${campaign.meetings?.length || 0})` :
               tab === 'sdrs' ? `SDRs (${campaign.applications?.filter(a => a.status === 'approved').length || 0})` :
               `Disputes`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Campaign Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">ICP Description</label>
                <p className="text-sm text-gray-900 mt-1">{campaign.icp_description}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Commission per Meeting</label>
                <p className="text-sm text-gray-900 mt-1">€{campaign.commission_per_meeting}</p>
              </div>
            </div>
          </div>

          {/* Qualification Rules */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Qualification Criteria</h2>
            {criteria.length > 0 ? (
              <ul className="space-y-2">
                {criteria.map((criterion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">•</span>
                    <span className="text-sm text-gray-700">{criterion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No qualification criteria defined</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Leads</div>
              <div className="text-2xl font-semibold text-gray-900">{campaign.leads?.length || 0}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Meetings</div>
              <div className="text-2xl font-semibold text-gray-900">{campaign.meetings?.length || 0}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Qualified</div>
              <div className="text-2xl font-semibold text-green-600">
                {campaign.meetings?.filter(m => m.status === 'qualified').length || 0}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">Active SDRs</div>
              <div className="text-2xl font-semibold text-gray-900">
                {campaign.applications?.filter(a => a.status === 'approved').length || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Leads</h2>
            <Link
              href={`/company/leads/upload?campaign=${campaignId}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              {t('common.uploadLeads')}
            </Link>
          </div>
          <div className="p-4">
            {campaign.leads && campaign.leads.length > 0 ? (
              <div className="space-y-2">
                {campaign.leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{lead.email} • {lead.phone}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                      lead.status === 'not_qualified' ? 'bg-red-100 text-red-700' :
                      lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-8">No leads yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Meetings Timeline</h2>
          </div>
          <div className="p-4">
            {campaign.meetings && campaign.meetings.length > 0 ? (
              <div className="space-y-4">
                {campaign.meetings.map((meeting) => (
                  <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Link
                          href={`/company/meetings/${meeting.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {meeting.contact_name}
                        </Link>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(meeting.meeting_date).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        meeting.status === 'qualified' ? 'bg-green-100 text-green-700' :
                        meeting.status === 'not_qualified' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    {meeting.notes && (
                      <p className="text-sm text-gray-600 mt-2">{meeting.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-8">{t('campaigns.noMeetings')}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sdrs' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{t('campaigns.assignedSdrs')}</h2>
          </div>
          <div className="p-4">
            {campaign.applications && campaign.applications.length > 0 ? (
              <div className="space-y-2">
                {campaign.applications
                  .filter(app => app.status === 'approved')
                  .map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">SDR #{app.sdr_id.slice(0, 8)}</div>
                        <div className="text-sm text-gray-500">{t('common.applied')} {new Date(app.applied_at).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}</div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        {t('common.approved')}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-8">No SDRs assigned yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Disputes</h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-400 italic text-center py-8">
              No disputes for this campaign
            </p>
          </div>
        </div>
      )}
    </SidebarLayout>
  )
}


