export type LeadStatus = 'new' | 'accepted' | 'rejected' | 'assigned' | 'processed' | 'forwarded'

export interface Lead {
  id: string
  source: string
  raw_payload: Record<string, any> | null
  email: string | null
  phone: string | null
  name: string | null
  message: string | null
  status: LeadStatus
  assigned_to: string | null
  created_at: string
  processed_at: string | null
}

export interface LeadFilter {
  status?: LeadStatus
  source?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
}

