import { useEffect, useState } from 'react'
import { WidgetProps } from './WidgetRegistry'

interface AmoCRMAnalyticsData {
  total_contacts: number
  contacts: any[]
}

export default function AmoCRMAnalytics({ settings }: WidgetProps) {
  const [data, setData] = useState<AmoCRMAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/analytics/amo', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching AmoCRM analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Loading AmoCRM analytics...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">AmoCRM Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Contacts</p>
          <p className="text-2xl font-bold text-blue-600">
            {data?.total_contacts || 0}
          </p>
        </div>
      </div>

      {data && data.total_contacts === 0 && (
        <p className="text-sm text-gray-500">No contacts synced yet</p>
      )}
    </div>
  )
}

