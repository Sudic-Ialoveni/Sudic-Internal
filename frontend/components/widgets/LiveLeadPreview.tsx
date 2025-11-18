'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Lead, LeadStatus } from '@/lib/types/leads'
import { WidgetProps } from './WidgetRegistry'
import { format } from 'date-fns'

interface LiveLeadPreviewSettings {
  initialFilter?: {
    status?: string
    source?: string
  }
  showActions?: boolean
}

export default function LiveLeadPreview({ settings }: WidgetProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadStatus | 'all'>(
    (settings as LiveLeadPreviewSettings)?.initialFilter?.status || 'all'
  )

  const config = (settings as LiveLeadPreviewSettings) || {}
  const showActions = config.showActions !== false

  useEffect(() => {
    // Initial fetch
    fetchLeads()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('Realtime update:', payload)
          fetchLeads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter])

  async function fetchLeads() {
    try {
      setLoading(true)
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      if (config.initialFilter?.source) {
        query = query.eq('source', config.initialFilter.source)
      }

      const { data, error } = await query

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateLeadStatus(id: string, status: LeadStatus) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    }
  }

  async function forwardToAmoCRM(id: string) {
    try {
      const response = await fetch(`/api/leads/${id}/forward-amo`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to forward')
      
      const data = await response.json()
      alert('Lead forwarded to AmoCRM')
    } catch (error) {
      console.error('Error forwarding lead:', error)
      alert('Failed to forward lead')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Live Leads</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as LeadStatus | 'all')}
          className="px-3 py-1 border rounded text-sm"
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

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">No leads found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {lead.source}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      lead.status === 'new' ? 'bg-green-100 text-green-800' :
                      lead.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                  
                  {lead.name && (
                    <p className="font-medium text-gray-900">{lead.name}</p>
                  )}
                  {lead.phone && (
                    <p className="text-sm text-gray-600">📞 {lead.phone}</p>
                  )}
                  {lead.email && (
                    <p className="text-sm text-gray-600">✉️ {lead.email}</p>
                  )}
                  {lead.message && (
                    <p className="text-sm text-gray-700 mt-2">{lead.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(lead.created_at), 'PPp')}
                  </p>
                </div>

                {showActions && (
                  <div className="flex flex-col gap-2 ml-4">
                    {lead.status === 'new' && (
                      <>
                        <button
                          onClick={() => updateLeadStatus(lead.id, 'accepted')}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateLeadStatus(lead.id, 'rejected')}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => forwardToAmoCRM(lead.id)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Forward to AmoCRM
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

