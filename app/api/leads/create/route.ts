import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { leadSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = leadSchema.parse(body)

    // Get company_id from campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('company_id')
      .eq('id', validated.campaign_id)
      .single()

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        campaign_id: validated.campaign_id,
        company_id: campaign.company_id,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email || null,
        phone: validated.phone,
        title: validated.title,
        company_name: validated.company_name,
        linkedin_url: validated.linkedin_url || null,
        status: validated.status,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, lead }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

