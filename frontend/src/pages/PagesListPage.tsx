import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { PageLoading } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'

interface Page {
  id: string
  slug: string
  title: string
  description: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export default function PagesListPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPages()
  }, [])

  async function fetchPages() {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPages(data || [])
    } catch (error) {
      console.error('Error fetching pages:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoading />

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Pages</h1>
        <Link
          to="/pages/new"
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Create New Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          title="No pages yet"
          description="Create your first dashboard page or use Tariti to generate one."
          action={
            <Link
              to="/tariti-gpt"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Open TaritiGPT to create a page →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={`/pages/${page.slug}`}
              className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold text-white">{page.title}</h2>
                {page.published ? (
                  <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-slate-600/50 text-slate-400 rounded-lg border border-slate-500/30">
                    Draft
                  </span>
                )}
              </div>
              {page.description && (
                <p className="text-sm text-slate-400 mb-4">{page.description}</p>
              )}
              <p className="text-xs text-slate-500">
                Updated {format(new Date(page.updated_at), 'PPp')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

