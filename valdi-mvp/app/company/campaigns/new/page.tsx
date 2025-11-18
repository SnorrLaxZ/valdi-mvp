'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    icpDescription: '',
    qualificationChecklist: ['', '', ''], // Start with 3 empty criteria
    script: '',
    commissionPerMeeting: 300
  })

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      qualificationChecklist: [...formData.qualificationChecklist, '']
    })
  }

  const removeChecklistItem = (index: number) => {
    const newChecklist = formData.qualificationChecklist.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      qualificationChecklist: newChecklist.length > 0 ? newChecklist : ['']
    })
  }

  const updateChecklistItem = (index: number, value: string) => {
    const newChecklist = [...formData.qualificationChecklist]
    newChecklist[index] = value
    setFormData({
      ...formData,
      qualificationChecklist: newChecklist
    })
  }

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')

      // Get company ID
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (companyError) throw companyError
      if (!company) throw new Error('Företag hittades inte')

      // Filter out empty criteria
      const filteredChecklist = formData.qualificationChecklist.filter(item => item.trim() !== '')
      
      if (filteredChecklist.length < 2) {
        throw new Error('Du måste ha minst 2 kvalificeringskriterier')
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          company_id: company.id,
          title: formData.title,
          icp_description: formData.icpDescription,
          meeting_criteria: JSON.stringify(filteredChecklist),
          script: formData.script || null,
          commission_per_meeting: formData.commissionPerMeeting,
          status: saveAsDraft ? 'draft' : 'active'
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Redirect to campaigns list
      router.push('/company/campaigns')
    } catch (err: any) {
      console.error('Campaign creation error:', err)
      setError(err.message || 'Kunde inte skapa kampanj')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/company/dashboard" className="text-2xl font-bold text-indigo-600">
            Valdi
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/company/dashboard" className="text-gray-700 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/company/campaigns" className="text-gray-700 hover:text-indigo-600">
              Kampanjer
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link href="/company/campaigns" className="text-indigo-600 hover:underline mb-4 inline-block">
            ← Tillbaka till kampanjer
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Skapa Ny Kampanj</h1>
          <p className="text-gray-600 mt-2">Fyll i information om din kampanj så kan SDR:er börja boka möten</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kampanjnamn *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="t.ex. Q4 Outbound för Enterprise Kunder"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Ett internt namn för att identifiera kampanjen</p>
          </div>

          {/* ICP Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ICP Beskrivning (Ideal Customer Profile) *
            </label>
            <textarea
              required
              rows={4}
              value={formData.icpDescription}
              onChange={(e) => setFormData({...formData, icpDescription: e.target.value})}
              placeholder="Beskriv din ideala kund. Exempel:&#10;- Företag: 50-500 anställda&#10;- Bransch: B2B SaaS&#10;- Titel: CTO, VP Engineering, Head of Product&#10;- Geografi: Sverige, Norge, Danmark"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Hjälper SDR:er förstå vem de ska kontakta</p>
          </div>

          {/* Qualification Checklist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kvalificeringskriterier (Checklista för SDR) *
            </label>
            <p className="text-sm text-gray-600 mb-3">
              SDR:en måste kryssa i dessa punkter när de loggar ett möte. Lägg till de viktigaste kriterierna för att ett möte ska vara kvalificerat.
            </p>
            
            <div className="space-y-3">
              {formData.qualificationChecklist.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                    <span className="text-gray-400">☐</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateChecklistItem(index, e.target.value)}
                      placeholder={
                        index === 0 ? "t.ex. Personen är beslutsfattare" :
                        index === 1 ? "t.ex. Har aktivt behov av lösningen" :
                        index === 2 ? "t.ex. Budget finns tillgänglig" :
                        "Lägg till kriterium..."
                      }
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0"
                      required={index < 2} // First 2 are required
                    />
                  </div>
                  {formData.qualificationChecklist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addChecklistItem}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Lägg till fler kriterier
            </button>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Tips:</strong> SDR:en måste kryssa i minst de första 2 kriterierna för att kunna logga mötet. Välj de viktigaste kriterierna först.
              </p>
            </div>
          </div>

          {/* Script */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Script / Talking Points (Valfritt)
            </label>
            <textarea
              rows={8}
              value={formData.script}
              onChange={(e) => setFormData({...formData, script: e.target.value})}
              placeholder="Hej [Namn],&#10;&#10;Jag heter [SDR Namn] och ringer från [Ditt Företag].&#10;&#10;Vi hjälper B2B SaaS-företag att...&#10;&#10;[Resten av scriptet]"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">SDR:er använder detta som grund för sina samtal</p>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provision per kvalificerat möte (€)
            </label>
            <input
              type="number"
              required
              min={100}
              max={1000}
              step={10}
              value={formData.commissionPerMeeting}
              onChange={(e) => setFormData({...formData, commissionPerMeeting: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Standard är €300. SDR:en får ca 58% (€{Math.round(formData.commissionPerMeeting * 0.58)})
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Vad händer härnäst?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• SDR:er kan se och ansöka till din kampanj</li>
              <li>• Du godkänner vilka SDR:er som får jobba på kampanjen</li>
              <li>• SDR:er börjar ringa och boka möten</li>
              <li>• Du godkänner eller avslår varje möte som bokas</li>
              <li>• Du betalar endast för godkända möten</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Skapar...' : 'Publicera Kampanj'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Spara som Utkast
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Du kan pausa eller stoppa kampanjen när som helst
          </p>
        </form>
      </main>
    </div>
  )
}