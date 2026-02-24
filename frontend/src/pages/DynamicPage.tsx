import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import PageRenderer from '@/components/PageRenderer'
import { PageConfig } from '@/lib/types/widgets'

interface PageData {
  title: string
  description: string | null
  config: PageConfig
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) loadPage()
  }, [slug])

  async function loadPage() {
    if (!slug) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle<{
          id: string
          slug: string
          title: string
          description: string | null
          creator: string | null
          config: PageConfig
          published: boolean
          created_at: string
          updated_at: string
        }>()

      if (fetchError) {
        setError(fetchError.code === 'PGRST116' ? 'Page not found' : 'Failed to load page')
        return
      }

      if (!data) {
        setError('Page not found')
        return
      }

      if (!data.published) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id !== data.creator) {
          setError('This page is not published')
          return
        }
      }

      setPage({ title: data.title, description: data.description, config: data.config })
    } catch {
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="flex gap-1.5">
          {[0, 150, 300].map(d => (
            <span key={d} className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-300 font-medium">{error}</p>
          <p className="text-slate-500 text-sm mt-1">Check the page slug or ask Tariti to create this page.</p>
        </div>
      </div>
    )
  }

  if (!page) return null

  return (
    <PageRenderer
      config={page.config}
      title={page.title}
      description={page.description ?? undefined}
    />
  )
}
