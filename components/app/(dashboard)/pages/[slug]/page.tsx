'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/components/lib/supabase/client'
import PageRenderer from '@/components/PageRenderer'
import { PageConfig } from '@/components/lib/types/widgets'
import { use } from 'react'

export default function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [config, setConfig] = useState<PageConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPage()
  }, [slug])

  async function loadPage() {
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
        // Check if user is creator or admin
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

