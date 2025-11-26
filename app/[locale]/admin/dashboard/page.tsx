'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalSDRs: 0,
    activeCampaigns: 0,
    pendingMeetings: 0,
    openDisputes: 0,
    pendingReviews: 0,
  })

  useEffect(() => {
    checkAuth()
    loadStats()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      router.push('/')
    }
  }

  const loadStats = async () => {
    try {
      // Get all stats
      const [companies, sdrs, campaigns, meetings, disputes, reviews] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('sdrs').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('admin_reviews').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        totalCompanies: companies.count || 0,
        totalSDRs: sdrs.count || 0,
        activeCampaigns: campaigns.count || 0,
        pendingMeetings: meetings.count || 0,
        openDisputes: disputes.count || 0,
        pendingReviews: reviews.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Total registered companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SDRs</CardTitle>
              <CardDescription>Total SDR accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSDRs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>Currently running campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeCampaigns}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Meetings</CardTitle>
              <CardDescription>Meetings awaiting review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingMeetings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Disputes</CardTitle>
              <CardDescription>Disputes requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.openDisputes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Admin reviews in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingReviews}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Review Meetings
              </Button>
              <Button className="w-full" variant="outline">
                Manage Disputes
              </Button>
              <Button className="w-full" variant="outline">
                View Audit Logs
              </Button>
              <Button className="w-full" variant="outline">
                Manage Training Materials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Database</span>
                  <span className="text-green-600">✓ Online</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage</span>
                  <span className="text-green-600">✓ Online</span>
                </div>
                <div className="flex justify-between">
                  <span>AI Services</span>
                  <span className="text-yellow-600">⚠ Pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

