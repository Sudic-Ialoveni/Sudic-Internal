import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import PageRenderer from '@/components/PageRenderer'
import { PageConfig } from '@/lib/types/widgets'

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>()
  const [config, setConfig] = useState<PageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      loadPage()
    }
  }, [slug])

  async function loadPage() {
    if (!slug) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Page not found')
        } else {
          throw fetchError
        }
        return
      }

      if (!data.published) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id !== data.creator) {
          setError('This page is not published')
          return
        }
      }

      setConfig(data.config as PageConfig)
    } catch (error) {
      console.error('Error loading page:', error)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading page...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="p-8">
        <p>No page configuration found</p>
      </div>
    )
  }

  return <PageRenderer config={config} />
}

