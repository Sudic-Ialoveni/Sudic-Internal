import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, hasEnvVars } from './lib/supabase/client'
import LoginPage from './pages/LoginPage'
import OAuthCallback from './pages/OAuthCallback'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import PagesListPage from './pages/PagesListPage'
import DynamicPage from './pages/DynamicPage'
import EnvError from './components/EnvError'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
        } else {
          setUser(session?.user || null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  // Show environment error if env vars are missing
  if (!hasEnvVars) {
    return <EnvError />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <PagesListPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/:slug"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DynamicPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

