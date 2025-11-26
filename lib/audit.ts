import { supabase } from './supabase'
import type { AuditLog } from './supabase'

export interface AuditLogEntry {
  action_type: string
  resource_type: string
  resource_id?: string
  changes?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export async function createAuditLog(entry: AuditLogEntry): Promise<AuditLog | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.warn('Cannot create audit log: user not authenticated')
    return null
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      action_type: entry.action_type,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      changes: entry.changes || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating audit log:', error)
    return null
  }

  return data
}

export async function getAuditLogs(
  resourceType?: string,
  resourceId?: string,
  limit: number = 100
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (resourceType) {
    query = query.eq('resource_type', resourceType)
  }

  if (resourceId) {
    query = query.eq('resource_id', resourceId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }

  return data || []
}

export async function getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching user audit logs:', error)
    return []
  }

  return data || []
}

