import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { useTheme } from '@/contexts/ThemeContext'
import { apiFetch, getToken } from '@/lib/api'

type NavItem = {
  label: string
  path: string
  icon: JSX.Element
}

type CustomPage = {
  id: string
  title: string | null
  slug: string
}

type DevNavItem = { label: string; path: string; icon: JSX.Element }

const devNavItems: DevNavItem[] = [
  {
    label: 'Monitoring log',
    path: '/dev/log',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    label: 'System prompt',
    path: '/dev/system-prompt',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Debugging',
    path: '/dev/debugging',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
    ),
  },
  {
    label: 'Tools reference',
    path: '/dev/tools',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    label: 'External APIs',
    path: '/dev/api',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    label: 'Tools tester',
    path: '/dev/tools-tester',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [customPages, setCustomPages] = useState<CustomPage[]>([])
  const [pagesLoading, setPagesLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const developer = useDeveloper()
  const theme = useTheme()

  const primaryNav = useMemo<NavItem[]>(
    () => [
      {
        label: 'Overview',
        path: '/',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        label: 'TaritiGPT Studio',
        path: '/tariti-gpt',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18" /><path d="m6 9 6-6 6 6" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        path: '/settings',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
    []
  )

  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/login')
        } else {
          setUser(session?.user || null)
        }
      }
    )

    fetchCustomPages()
    fetchPreferences()

    const onPagesChanged = () => fetchCustomPages()
    window.addEventListener('dashboard:pages-changed', onPagesChanged)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('dashboard:pages-changed', onPagesChanged)
    }
  }, [navigate])

  async function fetchPreferences() {
    try {
      const token = await getToken()
      if (!token) return
      const data = await apiFetch<{ preferences?: { developer_mode?: boolean } }>('/api/user/preferences')
      developer?.setDeveloperMode(!!data.preferences?.developer_mode)
    } catch {
      // ignore
    }
  }

  async function fetchCustomPages() {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug')
        .eq('published', true)
        .neq('slug', 'dashboard')
        .order('title', { ascending: true, nullsFirst: false })

      if (error) throw error
      setCustomPages(data || [])
    } catch (fetchError) {
      console.error('Error loading pages for navigation:', fetchError)
      setCustomPages([])
    } finally {
      setPagesLoading(false)
    }
  }

  function isActive(path: string) {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen flex bg-slate-900 text-slate-50 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col" aria-label="Sidebar navigation">
        <div className="px-6 pt-8 pb-6 border-b border-slate-800">
          <Link to="/" className="text-2xl font-semibold tracking-tight text-white" aria-label="Sudic Internal home">
            Sudic Internal
          </Link>
          <p className="text-xs text-slate-400 mt-2">Operations & Automation Control</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-white/10 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-slate-200">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pages
              </p>
              {!pagesLoading && customPages.length > 0 && (
                <span className="text-[10px] font-medium text-slate-500">
                  {customPages.length}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {pagesLoading && (
                <div className="px-3 py-2 text-xs text-slate-500">Loading pages...</div>
              )}
              {!pagesLoading && customPages.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500">
                  No custom pages published yet
                </div>
              )}
              {customPages.map((page) => (
                <Link
                  key={page.id}
                  to={`/pages/${page.slug}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    location.pathname === `/pages/${page.slug}`
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16v16H4z" /><path d="M9 4v16" />
                    </svg>
                  </span>
                  {page.title || page.slug}
                </Link>
              ))}
            </div>
          </div>

          {developer?.developerMode && (
            <div className="mt-8">
              <div className="flex items-center justify-between px-3 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500/90">
                  Development
                </p>
              </div>
              <div className="space-y-1">
                {devNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      location.pathname === item.path
                        ? 'bg-amber-500/10 text-amber-200'
                        : 'text-slate-400 hover:text-amber-200/90 hover:bg-amber-500/5'
                    }`}
                  >
                    <span className="text-amber-500/80">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-800 px-6 py-5">
          <p className="text-sm font-medium text-white">{user?.email || 'Loading user...'}</p>
          {theme && (
            <button
              type="button"
              onClick={theme.toggleTheme}
              className="mt-2 inline-flex items-center text-xs text-slate-400 hover:text-white"
              aria-label={theme.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme.theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex items-center text-sm text-slate-400 hover:text-white"
            aria-label="Sign out"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main id="main-content" className="flex-1 bg-slate-900 text-slate-100 overflow-hidden flex flex-col" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

