import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: campaignId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get campaign to find company
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('company_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get qualification rules for this company
    const { data: rules, error: rulesError } = await supabase
      .from('qualification_rules')
      .select('*')
      .eq('company_id', campaign.company_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    return NextResponse.json({ rules: rules || [] })
  } catch (error: any) {
    console.error('Error in get rules endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: campaignId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or company owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'

    // Get campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('company_id, companies!inner(user_id)')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const companyUserId = (campaign as any).companies.user_id
    if (!isAdmin && companyUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { rule_name, rule_description, criteria, is_active = true } = body

    if (!rule_name || !criteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create qualification rule
    const { data: rule, error: ruleError } = await supabase
      .from('qualification_rules')
      .insert({
        company_id: campaign.company_id,
        rule_name,
        rule_description: rule_description || null,
        criteria,
        is_active,
      })
      .select()
      .single()

    if (ruleError) {
      console.error('Error creating rule:', ruleError)
      return NextResponse.json({ error: ruleError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, rule })
  } catch (error: any) {
    console.error('Error in create rule endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: campaignId } = await params

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or company owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'

    // Get campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('company_id, companies!inner(user_id)')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const companyUserId = (campaign as any).companies.user_id
    if (!isAdmin && companyUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { rule_id, rule_name, rule_description, criteria, is_active } = body

    if (!rule_id) {
      return NextResponse.json({ error: 'Missing rule_id' }, { status: 400 })
    }

    // Update qualification rule
    const updateData: any = {}
    if (rule_name) updateData.rule_name = rule_name
    if (rule_description !== undefined) updateData.rule_description = rule_description
    if (criteria) updateData.criteria = criteria
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()

    const { data: rule, error: ruleError } = await supabase
      .from('qualification_rules')
      .update(updateData)
      .eq('id', rule_id)
      .eq('company_id', campaign.company_id)
      .select()
      .single()

    if (ruleError) {
      console.error('Error updating rule:', ruleError)
      return NextResponse.json({ error: ruleError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, rule })
  } catch (error: any) {
    console.error('Error in update rule endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

