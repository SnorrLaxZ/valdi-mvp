'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SidebarLayout } from '@/components/layouts/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, CheckCircle2 } from 'lucide-react'
import type { Campaign } from '@/lib/supabase'

export default function LeadUploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignIdParam = searchParams.get('campaign')
  
  const [companyName, setCompanyName] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignIdParam || '')
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreview, setCsvPreview] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)

  const fieldOptions = [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'title', label: 'Title' },
    { value: 'company_name', label: 'Company Name' },
    { value: 'linkedin_url', label: 'LinkedIn URL' },
  ]

  useEffect(() => {
    loadCompanyName()
    loadCampaigns()
  }, [])

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

  const loadCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!company) return

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      setCampaigns(campaignsData || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setUploaded(false)

    // Parse CSV
    const text = await selectedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const preview = lines.slice(1, 6).map(line => line.split(',').map(v => v.trim()))

    setCsvHeaders(headers)
    setCsvPreview(preview)

    // Auto-map common fields
    const autoMapping: Record<string, string> = {}
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase()
      if (lowerHeader.includes('first') || lowerHeader.includes('fname')) {
        autoMapping['first_name'] = header
      } else if (lowerHeader.includes('last') || lowerHeader.includes('lname') || lowerHeader.includes('surname')) {
        autoMapping['last_name'] = header
      } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
        autoMapping['email'] = header
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
        autoMapping['phone'] = header
      } else if (lowerHeader.includes('title') || lowerHeader.includes('job')) {
        autoMapping['title'] = header
      } else if (lowerHeader.includes('company')) {
        autoMapping['company_name'] = header
      } else if (lowerHeader.includes('linkedin')) {
        autoMapping['linkedin_url'] = header
      }
    })
    setMapping(autoMapping)
  }

  const handleUpload = async () => {
    if (!file || !selectedCampaignId) {
      alert('Please select a file and campaign')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaignId', selectedCampaignId)
      formData.append('mapping', JSON.stringify(mapping))

      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      setUploadCount(data.count || 0)
      setUploaded(true)
    } catch (error: any) {
      console.error('Error uploading leads:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const navItems = [
    { href: '/company/dashboard', label: 'Dashboard' },
    { href: '/company/campaigns', label: 'Kampanjer' },
    { href: '/company/meetings', label: 'Möten' },
    { href: '/company/disputes', label: 'Disputes' },
    { href: '/company/leads', label: 'Leads' },
  ]

  return (
    <SidebarLayout
      title="Upload Leads"
      subtitle={companyName}
      navItems={navItems}
      activePath="/company/leads"
    >
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Upload Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a CSV file with lead information</p>
        </div>

        {uploaded ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-green-900 mb-2">Upload Successful!</h2>
            <p className="text-sm text-green-700 mb-4">
              {uploadCount} leads have been imported successfully.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => {
                  setUploaded(false)
                  setFile(null)
                  setCsvHeaders([])
                  setCsvPreview([])
                  setMapping({})
                }}
                variant="outline"
              >
                Upload Another
              </Button>
              <Link href="/company/leads">
                <Button>View Leads</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campaign Selection */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Select Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select a campaign...</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Upload CSV File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Click to upload
                </label>
                <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                {file && (
                  <p className="text-sm text-gray-700 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>

            {/* Column Mapping */}
            {csvHeaders.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Map Columns</h2>
                <div className="space-y-3">
                  {fieldOptions.map((field) => (
                    <div key={field.value} className="flex items-center gap-3">
                      <label className="w-32 text-sm text-gray-700">{field.label}</label>
                      <select
                        value={mapping[field.value] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field.value]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">-- Select column --</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {csvHeaders.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-gray-700 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-100">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-gray-600">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {file && selectedCampaignId && (
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6"
                >
                  {uploading ? 'Uploading...' : 'Upload Leads'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}


