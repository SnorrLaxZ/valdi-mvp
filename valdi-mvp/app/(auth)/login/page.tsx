'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (authError) throw authError

      if (data.user) {
        // Get user profile to determine user type
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          throw profileError
        }

        console.log('User type:', profile.user_type)

        // Redirect based on user type with cache busting
        if (profile.user_type === 'company') {
          window.location.href = '/company/dashboard'
        } else if (profile.user_type === 'sdr') {
          window.location.href = '/sdr/dashboard'
        } else if (profile.user_type === 'admin') {
          window.location.href = '/admin/dashboard'
        } else {
          throw new Error('Okänd användartyp')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Fel email eller lösenord')
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
            Logga in
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              Lösenord
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Har du inget konto?{' '}
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Registrera dig
          </Link>
        </p>
      </div>
    </div>
  )
}