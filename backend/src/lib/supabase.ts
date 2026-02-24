import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types/database.js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables!')
} else {
  console.log('✅ Supabase environment variables loaded')
}

// Client for authenticated requests (uses anon key)
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  })
}

// Service role client for webhooks and admin operations
export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service operations')
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Get authenticated user from request (for Express middleware)
export async function getAuthenticatedUser(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  // Try service role client first (more reliable)
  if (supabaseServiceRoleKey) {
    try {
      const serviceClient = createServiceClient()
      const { data: { user }, error } = await serviceClient.auth.getUser(token)
      
      if (!error && user) {
        return user
      }
    } catch (error) {
      // Fall through to anon client
    }
  }
  
  // Fallback to anon client
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  
  if (userError || !user) {
    return null
  }

  return user
}

