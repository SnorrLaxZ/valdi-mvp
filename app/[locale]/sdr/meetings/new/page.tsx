'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/lib/supabase'

function LogMeetingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const campaignIdFromUrl = searchParams.get('campaign')
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdrId, setSdrId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  
  const [formData, setFormData] = useState({
    campaignId: campaignIdFromUrl || '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    meetingDate: '',
    notes: '',
    checklist: [] as boolean[]
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (formData.campaignId) {
      const campaign = campaigns.find(c => c.id === formData.campaignId)
      setSelectedCampaign(campaign || null)
      
      if (campaign) {
        // Initialize checklist based on campaign criteria
        const criteria = getQualificationCriteria(campaign.meeting_criteria)
        setFormData(prev => ({
          ...prev,
          checklist: new Array(criteria.length).fill(false)
        }))
      }
    }
  }, [formData.campaignId, campaigns])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get SDR ID
      const { data: sdr } = await supabase
        .from('sdrs')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!sdr) return
      setSdrId(sdr.id)

      // Load campaigns the SDR is approved for
      const { data: applications } = await supabase
        .from('campaign_applications')
        .select('campaign_id')
        .eq('sdr_id', sdr.id)
        .eq('status', 'approved')

      if (!applications || applications.length === 0) {
        setError('Du har inga godkända kampanjer ännu. Ansök till en kampanj först!')
        setLoadingData(false)
        return
      }

      const campaignIds = applications.map(app => app.campaign_id)

      // Load the actual campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', campaignIds)
        .eq('status', 'active')

      setCampaigns(campaignsData || [])

      // If campaign was pre-selected from URL, set it
      if (campaignIdFromUrl && campaignsData) {
        setFormData(prev => ({ ...prev, campaignId: campaignIdFromUrl }))
      }

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Kunde inte ladda data')
    } finally {
      setLoadingData(false)
    }
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

  const toggleCheckbox = (index: number) => {
    const newChecklist = [...formData.checklist]
    newChecklist[index] = !newChecklist[index]
    setFormData({ ...formData, checklist: newChecklist })
  }

  const canSubmit = () => {
    if (!formData.campaignId || !formData.contactName || !formData.meetingDate) {
      return false
    }
    
    // Must check at least first 2 criteria
    return formData.checklist[0] && formData.checklist[1]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canSubmit() || !sdrId) return

    setLoading(true)
    setError(null)

    try {
      const { error: meetingError } = await supabase
        .from('meetings')
        .insert({
          campaign_id: formData.campaignId,
          sdr_id: sdrId,
          contact_name: formData.contactName,
          contact_email: formData.contactEmail || null,
          contact_phone: formData.contactPhone || null,
          meeting_date: formData.meetingDate,
          notes: formData.notes || null,
          qualification_checklist: formData.checklist,
          status: 'pending'
        })

      if (meetingError) throw meetingError

      // Redirect to dashboard with success message
      router.push('/sdr/dashboard?success=meeting_logged')
    } catch (err: any) {
      console.error('Error logging meeting:', err)
      setError(err.message || 'Kunde inte logga mötet')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Laddar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/sdr/dashboard" className="text-2xl font-bold text-indigo-600">
            Valdi
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/sdr/dashboard" className="text-gray-700 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/sdr/campaigns" className="text-gray-700 hover:text-indigo-600">
              Kampanjer
            </Link>
            <Link href="/sdr/earnings" className="text-gray-700 hover:text-indigo-600">
              Intjäning
            </Link>
            <button onClick={handleLogout} className="text-gray-700 hover:text-indigo-600">
              Logga ut
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link href="/sdr/dashboard" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Tillbaka till dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Logga Bokat Möte</h1>
          <p className="text-gray-600 mt-2">Fyll i information om det möte du har bokat</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Inga godkända kampanjer</h2>
            <p className="text-gray-600 mb-6">Du måste vara godkänd för en kampanj innan du kan logga möten</p>
            <Link
              href="/sdr/campaigns"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Hitta Kampanjer
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Campaign Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kampanj *
              </label>
              <select
                required
                value={formData.campaignId}
                onChange={(e) => setFormData({...formData, campaignId: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Välj kampanj...</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} (€{Math.round(campaign.commission_per_meeting * 0.58)})
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontaktperson *
              </label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                placeholder={t('sdr.meetings.new.contactPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  placeholder="anders@företag.se"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  placeholder="+46 70 123 45 67"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mötesdatum & tid *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.meetingDate}
                onChange={(e) => setFormData({...formData, meetingDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* QUALIFICATION CHECKLIST */}
            {selectedCampaign && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  ✓ Kvalificeringskriterier
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bekräfta att mötet uppfyller följande kriterier. <strong>De första 2 är obligatoriska.</strong>
                </p>
                
                <div className="space-y-3">
                  {getQualificationCriteria(selectedCampaign.meeting_criteria).map((criterion, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                        formData.checklist[index]
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.checklist[index] || false}
                        onChange={() => toggleCheckbox(index)}
                        className="mt-1 h-5 w-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">
                          {criterion}
                        </span>
                        {index < 2 && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">
                            (Obligatorisk)
                          </span>
                        )}
                      </div>
                      {formData.checklist[index] && (
                        <span className="text-green-600 font-bold">✓</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anteckningar
              </label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Extra information om mötet, vad som diskuterades, etc..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              {!canSubmit() && formData.campaignId && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                  ⚠️ Du måste fylla i kontaktperson, mötesdatum och de 2 första kvalificeringskriterierna
                </div>
              )}
              <button
                type="submit"
                disabled={!canSubmit() || loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loggar möte...' : canSubmit() ? 'Logga Möte' : 'Fyll i alla obligatoriska fält'}
              </button>
              {selectedCampaign && canSubmit() && (
                <p className="text-sm text-green-600 text-center mt-2 font-medium">
                  💰 Du tjänar €{Math.round(selectedCampaign.commission_per_meeting * 0.58)} när företaget godkänner mötet
                </p>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default function LogMeetingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LogMeetingForm />
    </Suspense>
  )
}