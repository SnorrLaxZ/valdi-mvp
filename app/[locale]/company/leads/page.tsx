'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { SidebarLayout } from '@/components/layouts/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Search } from 'lucide-react'
import type { Lead } from '@/lib/supabase'

export default function LeadOverviewPage() {
  const router = useRouter()
  const locale = useLocale()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [companyName, setCompanyName] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'not_qualified' | 'converted' | 'suppressed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadLeads()
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

  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!company) return

      let query = supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: leadsData } = await query.order('created_at', { ascending: false })

      setLeads(leadsData || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.first_name?.toLowerCase().includes(query) ||
      lead.last_name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.company_name?.toLowerCase().includes(query)
    )
  })

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const toggleAllLeads = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedLeads.size === 0) {
      alert('Please select leads first')
      return
    }

    try {
      const updates = Array.from(selectedLeads).map(id => ({
        id,
        status: action,
      }))

      // Update leads
      for (const update of updates) {
        await supabase
          .from('leads')
          .update({ status: action })
          .eq('id', update.id)
      }

      await loadLeads()
      setSelectedLeads(new Set())
      alert(`Updated ${selectedLeads.size} leads`)
    } catch (error) {
      console.error('Error updating leads:', error)
      alert('Error updating leads')
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
      case 'qualified':
        return 'bg-green-100 text-green-700'
      case 'not_qualified':
        return 'bg-red-100 text-red-700'
      case 'contacted':
        return 'bg-blue-100 text-blue-700'
      case 'converted':
        return 'bg-purple-100 text-purple-700'
      case 'suppressed':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-yellow-100 text-yellow-700'
    }
  }

  return (
    <SidebarLayout
      title="Leads"
      subtitle={companyName}
      navItems={navItems}
      activePath="/company/leads"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your lead database</p>
          </div>
          <Link href="/company/leads/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'new', 'contacted', 'qualified', 'not_qualified'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' :
                 f === 'new' ? 'New' :
                 f === 'contacted' ? 'Contacted' :
                 f === 'qualified' ? 'Qualified' :
                 'Not Qualified'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">
              {selectedLeads.size} lead(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('contacted')}
              >
                Mark as Contacted
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('suppressed')}
              >
                Suppress
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leads List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Laddar...</div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <p className="text-sm text-gray-400">No leads found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleAllLeads}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.company_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SidebarLayout>
  )
}


