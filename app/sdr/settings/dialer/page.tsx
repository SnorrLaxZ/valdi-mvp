'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getSDRDialerIntegrations,
  upsertDialerIntegration,
  deactivateDialerIntegration,
  getDialerSetupInstructions,
  generateWebhookSecret,
  type DialerProvider,
} from '@/lib/dialer'
import type { DialerIntegration } from '@/lib/dialer'

export default function DialerSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sdrId, setSdrId] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<DialerIntegration[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<DialerProvider>('aircall')
  const [formData, setFormData] = useState({
    providerAccountId: '',
    providerPhoneNumber: '',
    webhookSecret: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: sdr } = await supabase
        .from('sdrs')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!sdr) return

      setSdrId(sdr.id)
      const dialerIntegrations = await getSDRDialerIntegrations(sdr.id)
      setIntegrations(dialerIntegrations)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sdrId) return

    setLoading(true)
    try {
      const secret = formData.webhookSecret || generateWebhookSecret()
      const integration = await upsertDialerIntegration(
        sdrId,
        selectedProvider,
        formData.providerAccountId,
        formData.providerPhoneNumber || null,
        secret,
        {}
      )

      if (integration) {
        await loadData()
        setShowAddForm(false)
        setFormData({
          providerAccountId: '',
          providerPhoneNumber: '',
          webhookSecret: '',
        })
        alert('Dialer integration added successfully!')
      }
    } catch (error: any) {
      console.error('Error adding integration:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (integrationId: string) => {
    if (!sdrId || !confirm('Are you sure you want to deactivate this integration?')) return

    const success = await deactivateDialerIntegration(integrationId, sdrId)
    if (success) {
      await loadData()
      alert('Integration deactivated')
    }
  }

  const setupInstructions = getDialerSetupInstructions(selectedProvider)

  if (loading && !sdrId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Laddar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dialer Integrationer</h1>
          <p className="text-gray-600">
            Koppla dina dialer-konton för automatisk synkronisering av samtal och inspelningar
          </p>
        </div>

        {/* Existing Integrations */}
        {integrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Aktiva Integrationer</h2>
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">
                        {integration.dialer_provider}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Konto: {integration.provider_account_id}
                      </p>
                      {integration.provider_phone_number && (
                        <p className="text-sm text-gray-600">
                          Telefon: {integration.provider_phone_number}
                        </p>
                      )}
                      {integration.last_sync_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Senast synkad: {new Date(integration.last_sync_at).toLocaleString('sv-SE')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeactivate(integration.id)}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      Inaktivera
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Integration */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            + Lägg till Dialer Integration
          </button>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Lägg till Ny Integration</h2>

            <form onSubmit={handleAddIntegration} className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dialer Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as DialerProvider)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="aircall">Aircall</option>
                  <option value="ringcentral">RingCentral</option>
                  <option value="twilio">Twilio</option>
                  <option value="justcall">JustCall</option>
                  <option value="kixie">Kixie</option>
                  <option value="other">Annat</option>
                </select>
              </div>

              {/* Setup Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Instruktioner för {setupInstructions.name}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                  {setupInstructions.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
                <div className="mt-3 p-3 bg-blue-100 rounded">
                  <p className="text-xs font-mono text-blue-900 break-all">
                    Webhook URL: {setupInstructions.webhookUrl}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {setupInstructions.requiredFields[0]} *
                </label>
                <input
                  type="text"
                  value={formData.providerAccountId}
                  onChange={(e) =>
                    setFormData({ ...formData, providerAccountId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="T.ex. User ID, Account SID, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefonnummer (valfritt)
                </label>
                <input
                  type="text"
                  value={formData.providerPhoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, providerPhoneNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+46..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Secret (valfritt - genereras automatiskt om tomt)
                </label>
                <input
                  type="text"
                  value={formData.webhookSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, webhookSecret: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Lämna tomt för auto-generering"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? 'Sparar...' : 'Spara Integration'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setFormData({
                      providerAccountId: '',
                      providerPhoneNumber: '',
                      webhookSecret: '',
                    })
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Viktig Information</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Samtal inspelningar sparas automatiskt i 30 dagar (GDPR-kompatibelt)</li>
            <li>Endast samtal med inspelningar synkroniseras</li>
            <li>Samtal länkas automatiskt till leads och möten</li>
            <li>Du kan när som helst inaktivera en integration</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

