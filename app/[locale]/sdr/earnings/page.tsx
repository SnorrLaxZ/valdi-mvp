'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import type { Meeting } from '@/lib/supabase'

export default function EarningsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [sdrName, setSdrName] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    totalMeetings: 0,
    qualifiedMeetings: 0
  })

  useEffect(() => {
    checkAuth()
    loadEarningsData()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/${locale}/login`)
    }
  }

  const loadEarningsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile) setSdrName(profile.full_name || '')

      const { data: sdrData } = await supabase
        .from('sdrs')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!sdrData) return

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*, campaigns(commission_per_meeting)')
        .eq('sdr_id', sdrData.id)
        .order('created_at', { ascending: false })

      setMeetings(meetingsData || [])

      let totalEarnings = 0
      let pendingEarnings = 0
      let paidEarnings = 0

      meetingsData?.forEach((meeting: any) => {
        const commission = meeting.campaigns?.commission_per_meeting || 300
        const sdrEarning = Math.floor(commission * 0.58)

        if (meeting.status === 'qualified') {
          totalEarnings += sdrEarning
          // Assume paid if older than 7 days
          const daysSince = (Date.now() - new Date(meeting.created_at).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSince > 7) {
            paidEarnings += sdrEarning
          } else {
            pendingEarnings += sdrEarning
          }
        } else if (meeting.status === 'pending') {
          pendingEarnings += sdrEarning
        }
      })

      const qualifiedMeetings = meetingsData?.filter(m => m.status === 'qualified').length || 0

      setStats({
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        totalMeetings: meetingsData?.length || 0,
        qualifiedMeetings
      })

    } catch (error) {
      console.error('Error loading earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link href={`/${locale}/sdr/dashboard`} className="text-xl font-semibold text-gray-900">
            Valdi
          </Link>
          <p className="text-xs text-gray-500 mt-1">{sdrName}</p>
        </div>
        
        <nav className="mt-8 px-4">
          <Link 
            href={`/${locale}/sdr/dashboard`}
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            {t('common.dashboard')}
          </Link>
          <Link 
            href={`/${locale}/sdr/campaigns`}
            className="block px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md mb-1 text-sm"
          >
            {t('common.campaigns')}
          </Link>
          <Link 
            href={`/${locale}/sdr/earnings`}
            className="block px-3 py-2.5 bg-gray-900 text-white rounded-md mb-1 text-sm font-medium"
          >
            {t('common.earnings')}
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
          >
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 bg-white">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900">{t('sdr.earnings.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('sdr.earnings.subtitle')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('sdr.earnings.totalEarnings')}</div>
            <div className="text-3xl font-semibold text-gray-900">€{stats.totalEarnings}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.qualifiedMeetings} {t('sdr.earnings.approved')}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('sdr.earnings.pending')}</div>
            <div className="text-3xl font-semibold text-yellow-600">€{stats.pendingEarnings}</div>
            <div className="text-xs text-gray-500 mt-1">{t('sdr.earnings.pendingDesc')}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('sdr.earnings.paid')}</div>
            <div className="text-3xl font-semibold text-green-600">€{stats.paidEarnings}</div>
            <div className="text-xs text-gray-500 mt-1">{t('sdr.earnings.paidDesc')}</div>
          </div>
        </div>

        {/* Earnings List */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('sdr.earnings.history')}</h2>
          </div>
          <div className="p-6">
            {meetings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">{t('sdr.earnings.noMeetings')}</p>
                <Link
                  href={`/${locale}/sdr/meetings/new`}
                  className="inline-block mt-3 text-xs text-gray-900 hover:underline"
                >
                  {t('sdr.earnings.logFirstMeeting')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting: any) => {
                  const commission = meeting.campaigns?.commission_per_meeting || 300
                  const sdrEarning = Math.floor(commission * 0.58)
                  const daysSince = (Date.now() - new Date(meeting.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  const isPaid = meeting.status === 'qualified' && daysSince > 7

                  return (
                    <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{meeting.contact_name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              meeting.status === 'qualified' ? 'bg-green-100 text-green-700' :
                              meeting.status === 'not_qualified' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {meeting.status === 'qualified' ? t('sdr.earnings.status.approved') :
                               meeting.status === 'not_qualified' ? t('sdr.earnings.status.rejected') : t('sdr.earnings.status.pending')}
                            </span>
                            {isPaid && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                {t('sdr.earnings.paid')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(meeting.meeting_date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {meeting.status === 'not_qualified' && meeting.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1">
                              {t('sdr.earnings.rejectionReason')}: {t(`sdr.earnings.rejectionReasons.${meeting.rejection_reason}` as any)}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          {meeting.status === 'qualified' && (
                            <div className="text-lg font-semibold text-gray-900">
                              €{sdrEarning}
                            </div>
                          )}
                          {meeting.status === 'pending' && (
                            <div className="text-lg font-semibold text-yellow-600">
                              €{sdrEarning}
                            </div>
                          )}
                          {meeting.status === 'not_qualified' && (
                            <div className="text-sm text-gray-400">
                              €0
                            </div>
                          )}
                          {isPaid && (
                            <div className="text-xs text-green-600 mt-1">{t('sdr.earnings.paidDesc')}</div>
                          )}
                          {meeting.status === 'qualified' && !isPaid && (
                            <div className="text-xs text-yellow-600 mt-1">{t('sdr.earnings.waitingPayment')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


