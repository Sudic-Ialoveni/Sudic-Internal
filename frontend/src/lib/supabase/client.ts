import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'
import { env, hasEnvVars } from '@/lib/env'

export { hasEnvVars }

if (!hasEnvVars) {
  console.error('⚠️ Missing Supabase environment variables!')
  console.error('Please create a .env file in the frontend directory with:')
  console.error('VITE_SUPABASE_URL=your_supabase_url')
  console.error('VITE_SUPABASE_ANON_KEY=your_anon_key')
}

// Create client - will work even with placeholder values (auth will just fail gracefully)
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

