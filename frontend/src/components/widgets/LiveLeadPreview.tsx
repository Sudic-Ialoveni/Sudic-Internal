import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Lead, LeadStatus } from '@/lib/types/leads'
import { WidgetProps } from './WidgetRegistry'
import { format } from 'date-fns'

interface LiveLeadPreviewSettings {
  initialFilter?: { status?: string; source?: string }
  showActions?: boolean
}

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  accepted:  'bg-sky-500/15 text-sky-300 border-sky-500/20',
  rejected:  'bg-rose-500/15 text-rose-300 border-rose-500/20',
  assigned:  'bg-violet-500/15 text-violet-300 border-violet-500/20',
  processed: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  forwarded: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
}

export default function LiveLeadPreview({ settings }: WidgetProps) {
  const config = (settings as LiveLeadPreviewSettings) || {}
  const showActions = config.showActions !== false

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadStatus | 'all'>(
    (config.initialFilter?.status as LeadStatus | 'all') || 'all',
  )
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
    const channel = supabase
      .channel('leads-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [filter])

  async function fetchLeads() {
    try {
      setLoading(true)
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50)
      if (filter !== 'all') query = query.eq('status', filter)
      if (config.initialFilter?.source) query = query.eq('source', config.initialFilter.source)
      const { data, error } = await query
      if (error) throw error
      setLeads(data || [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  async function updateLeadStatus(id: string, status: LeadStatus) {
    try {
      setActionLoading(id)
      const { supabase: sb } = await import('@/lib/supabase/client')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      fetchLeads()
    } catch {
      /* silent */
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Live</p>
          <h3 className="text-sm font-semibold text-slate-200 mt-0.5">Leads</h3>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as LeadStatus | 'all')}
          className="bg-slate-700/60 border border-slate-600/50 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="assigned">Assigned</option>
          <option value="processed">Processed</option>
          <option value="forwarded">Forwarded</option>
        </select>
      </div>

      {/* Lead list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 100, 200].map(d => (
                <span key={d} className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-slate-500">No leads found</p>
          </div>
        ) : (
          leads.map(lead => (
            <div key={lead.id} className="bg-slate-700/30 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/60 transition-colors">
              <div className="flex items-start gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {lead.source && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-600/50 text-slate-300 border border-slate-600/30">
                        {lead.source}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${STATUS_STYLES[lead.status] ?? 'bg-slate-600/30 text-slate-400 border-slate-600/20'}`}>
                      {lead.status}
                    </span>
                  </div>

                  {lead.name && <p className="text-sm font-medium text-slate-200 truncate">{lead.name}</p>}
                  {lead.phone && <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>}
                  {lead.email && <p className="text-xs text-slate-400 truncate">{lead.email}</p>}
                  {lead.message && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{lead.message}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1.5">
                    {format(new Date(lead.created_at), 'dd MMM, HH:mm')}
                  </p>
                </div>

                {showActions && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {lead.status === 'new' && (
                      <>
                        <button
                          onClick={() => updateLeadStatus(lead.id, 'accepted')}
                          disabled={actionLoading === lead.id}
                          className="px-2 py-1 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateLeadStatus(lead.id, 'rejected')}
                          disabled={actionLoading === lead.id}
                          className="px-2 py-1 text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded hover:bg-rose-500/25 transition-colors disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
