import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

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

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading pages...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pages</h1>
        <Link
          to="/pages/new"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create New Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="text-gray-500">No pages found. Create your first page!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={`/pages/${page.slug}`}
              className="p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold">{page.title}</h2>
                {page.published ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                    Draft
                  </span>
                )}
              </div>
              {page.description && (
                <p className="text-sm text-gray-600 mb-4">{page.description}</p>
              )}
              <p className="text-xs text-gray-400">
                Updated {format(new Date(page.updated_at), 'PPp')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

