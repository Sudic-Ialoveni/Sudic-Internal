import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export default function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('OAuth error:', error)
          navigate('/login?error=oauth_failed')
          return
        }

        if (session) {
          navigate('/')
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        navigate('/login?error=oauth_failed')
      }
    }

    handleOAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing sign in...</p>
    </div>
  )
}

