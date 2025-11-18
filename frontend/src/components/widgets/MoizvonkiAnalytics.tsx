import { useEffect, useState } from 'react'
import { WidgetProps } from './WidgetRegistry'

interface MoizvonkiAnalyticsData {
  total_calls: number
  total_duration: number
  avg_duration: number
  status_counts: Record<string, number>
  calls: any[]
}

export default function MoizvonkiAnalytics({ settings }: WidgetProps) {
  const [data, setData] = useState<MoizvonkiAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/analytics/moizvonki', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching Moizvonki analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Loading Moizvonki analytics...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Moizvonki Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Calls</p>
          <p className="text-2xl font-bold text-green-600">
            {data?.total_calls || 0}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Duration</p>
          <p className="text-2xl font-bold text-blue-600">
            {data ? formatDuration(data.total_duration) : '0m 0s'}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-gray-600">Avg Duration</p>
          <p className="text-2xl font-bold text-purple-600">
            {data ? formatDuration(data.avg_duration) : '0m 0s'}
          </p>
        </div>
      </div>

      {data && data.status_counts && Object.keys(data.status_counts).length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Status Breakdown</h3>
          <div className="space-y-1">
            {Object.entries(data.status_counts).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-gray-600">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

