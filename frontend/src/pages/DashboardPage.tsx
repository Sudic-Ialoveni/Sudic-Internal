import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import PageRenderer from '@/components/PageRenderer'
import { PageConfig } from '@/lib/types/widgets'

export default function DashboardPage() {
  const [config, setConfig] = useState<PageConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDefaultPage()
  }, [])

  async function loadDefaultPage() {
    try {
      const { data: page } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', 'dashboard')
        .eq('published', true)
        .single()

      if (page) {
        setConfig(page.config as PageConfig)
      } else {
        setConfig({
          layout: { cols: 12, gap: 4 },
          widgets: [
            {
              id: 'w1',
              type: 'LiveLeadPreview',
              colSpan: 8,
              settings: {
                showActions: true,
              },
            },
            {
              id: 'w2',
              type: 'AmoCRMAnalytics',
              colSpan: 4,
            },
            {
              id: 'w3',
              type: 'MoizvonkiAnalytics',
              colSpan: 6,
            },
            {
              id: 'w4',
              type: 'TaritiGPTPrompt',
              colSpan: 6,
            },
          ],
        })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setConfig({
        layout: { cols: 12, gap: 4 },
        widgets: [
          {
            id: 'w1',
            type: 'LiveLeadPreview',
            colSpan: 12,
            settings: {
              showActions: true,
            },
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-8">
        <p>No dashboard configuration found</p>
      </div>
    )
  }

  return <PageRenderer config={config} />
}

