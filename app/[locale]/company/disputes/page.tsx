'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { SidebarLayout } from '@/components/layouts/SidebarLayout'
import type { Dispute, Meeting } from '@/lib/supabase'

interface DisputeWithMeeting extends Dispute {
  meetings: Meeting
}

export default function DisputeCenterPage() {
  const router = useRouter()
  const t = useTranslations()
  const locale = useLocale()
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState<DisputeWithMeeting[]>([])
  const [companyName, setCompanyName] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'under_review' | 'resolved'>('all')

  useEffect(() => {
    loadDisputes()
    loadCompanyName()
  }, [filter])

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

  const loadDisputes = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get company
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!company) return

      // Get campaigns for this company
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('company_id', company.id)

      if (!campaigns) return

      const campaignIds = campaigns.map(c => c.id)

      // Get meetings for these campaigns
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id')
        .in('campaign_id', campaignIds)

      if (!meetings) return

      const meetingIds = meetings.map(m => m.id)

      // Get disputes for these meetings
      let query = supabase
        .from('disputes')
        .select(`
          *,
          meetings (*)
        `)
        .in('meeting_id', meetingIds)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: disputesData } = await query.order('created_at', { ascending: false })

      if (disputesData) {
        setDisputes(disputesData as any)
      }
    } catch (error) {
      console.error('Error loading disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { href: '/company/dashboard', label: 'Dashboard' },
    { href: '/company/campaigns', label: 'Kampanjer' },
    { href: '/company/meetings', label: 'Möten' },
    { href: '/company/disputes', label: 'Disputes' },
    { href: '/company/leads', label: 'Leads' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'under_review':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'resolved':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getDisputeTypeLabel = (type: string) => {
    switch (type) {
      case 'qualification':
        return 'Qualification Dispute'
      case 'quality':
        return 'Quality Dispute'
      case 'payment':
        return 'Payment Dispute'
      default:
        return 'Other Dispute'
    }
  }

  return (
    <SidebarLayout
      title={t('common.disputeCenter')}
      subtitle={companyName}
      navItems={navItems}
      activePath="/company/disputes"
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{t('common.disputeCenter')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('disputes.manage')}</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="flex border-b border-gray-200">
          {(['all', 'open', 'under_review', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                filter === f
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' :
               f === 'open' ? 'Open' :
               f === 'under_review' ? 'Under Review' :
               'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* Disputes List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Laddar...</div>
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <p className="text-sm text-gray-400">No disputes found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div key={dispute.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getDisputeTypeLabel(dispute.dispute_type)}
                    </h3>
                    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getStatusColor(dispute.status)}`}>
                      {dispute.status.replace('_', ' ')}
                    </span>
                  </div>
                  {dispute.meetings && (
                    <Link
                      href={`/company/meetings/${dispute.meeting_id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      View Meeting: {(dispute.meetings as any).contact_name}
                    </Link>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(dispute.created_at).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                </span>
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">{t('common.reason')}</label>
                <p className="text-sm text-gray-700">{dispute.reason}</p>
              </div>

              {dispute.resolution && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">{t('common.adminResolution')}</label>
                  <p className="text-sm text-gray-700">{dispute.resolution}</p>
                  {dispute.resolved_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('common.resolved')} {new Date(dispute.resolved_at).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                    </p>
                  )}
                </div>
              )}

              {dispute.status === 'open' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 italic">
                    This dispute is awaiting admin review
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SidebarLayout>
  )
}


