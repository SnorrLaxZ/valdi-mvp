import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is company
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    if (profile?.user_type !== 'company') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const campaignId = formData.get('campaignId') as string
    const mapping = JSON.parse(formData.get('mapping') as string)

    if (!file || !campaignId || !mapping) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get company ID
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Parse CSV
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())

    const leads = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const lead: any = {
        campaign_id: campaignId,
        company_id: company.id,
        status: 'new',
      }

      // Map columns based on mapping
      Object.keys(mapping).forEach(field => {
        const columnIndex = headers.indexOf(mapping[field])
        if (columnIndex >= 0 && values[columnIndex]) {
          lead[field] = values[columnIndex]
        }
      })

      // Combine first_name and last_name if needed
      if (lead.first_name && lead.last_name) {
        // Already set
      } else if (lead.name) {
        const nameParts = lead.name.split(' ')
        lead.first_name = nameParts[0] || null
        lead.last_name = nameParts.slice(1).join(' ') || null
        delete lead.name
      }

      leads.push(lead)
    }

    // Insert leads in batches
    const batchSize = 100
    const insertedLeads = []
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select()

      if (error) {
        console.error('Error inserting leads batch:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      insertedLeads.push(...(data || []))
    }

    return NextResponse.json({
      success: true,
      count: insertedLeads.length,
      leads: insertedLeads,
    })
  } catch (error: any) {
    console.error('Error in lead upload endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


