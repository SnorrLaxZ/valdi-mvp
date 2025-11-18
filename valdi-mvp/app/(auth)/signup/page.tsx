'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = (searchParams.get('type') || 'company') as 'company' | 'sdr'
  
  console.log('URL searchParams:', searchParams.toString())
  console.log('Detected userType:', userType)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    phone: ''
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('Signing up with user_type:', userType)

    try {
      // 1. Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: userType
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        console.log('User created, setting user_type to:', userType)

        // Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 2. Update profile with additional info - FORCE the correct user_type
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            user_type: userType, // This should be 'sdr' or 'company'
            company_name: userType === 'company' ? formData.companyName : null,
            phone: formData.phone
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Profile error:', profileError)
          throw profileError
        }

        // Verify the profile was created correctly
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', authData.user.id)
          .single()

        console.log('Verified user_type in database:', verifyProfile?.user_type)

        // 3. Create company or SDR record with better error handling
        if (userType === 'company') {
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              user_id: authData.user.id,
              company_name: formData.companyName
            })
          
          if (companyError) {
            console.error('Company error:', companyError)
            throw new Error(`Kunde inte skapa företagsprofil: ${companyError.message}`)
          }
        } else if (userType === 'sdr') {
          const { error: sdrError } = await supabase
            .from('sdrs')
            .insert({
              user_id: authData.user.id,
              status: 'pending'
            })
          
          if (sdrError) {
            console.error('SDR error:', sdrError)
            throw new Error(`Kunde inte skapa SDR-profil: ${sdrError.message}`)
          }
        }

        // 4. Redirect to appropriate dashboard
        window.location.href = userType === 'company' ? '/company/dashboard' : '/sdr/dashboard'
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Något gick fel vid registrering')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-indigo-600">
            Valdi
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">
            {userType === 'company' ? 'Registrera Företag' : 'Registrera som SDR'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fullständigt namn
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {userType === 'company' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Företagsnamn
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lösenord
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Minst 6 tecken</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrerar...' : 'Registrera'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Har du redan ett konto?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  )
}