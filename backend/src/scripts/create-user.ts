/**
 * Script to create a user account via Supabase Admin API
 * Run with: npx tsx src/scripts/create-user.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function createUser() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env')
    return
  }

  try {
    // Create client directly with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    console.log('Creating user...')
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'sudic.md@gmail.com',
      password: 'Teodor@2011',
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
        console.log('\n✅ User already exists!')
        console.log('Email: sudic.md@gmail.com')
        console.log('\nYou can sign in at http://localhost:3000/login')
        console.log('\nIf login fails, try:')
        console.log('1. Check password is correct: Teodor@2011')
        console.log('2. Verify email is confirmed in Supabase Dashboard')
        console.log('3. Reset password if needed: https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/users')
        return
      }
      console.error('❌ Error creating user:', error.message)
      console.error('\nAlternative: Create user via Supabase Dashboard:')
      console.error('https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/users')
      return
    }

    console.log('\n✅ User created successfully!')
    console.log('User ID:', data.user.id)
    console.log('Email:', data.user.email)
    console.log('\nYou can now sign in at http://localhost:3000/login')
  } catch (error: any) {
    console.error('❌ Failed to create user:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 5).join('\n'))
    }
    console.error('\nAlternative: Create user via Supabase Dashboard:')
    console.error('https://supabase.com/dashboard/project/vlmqrqkvpeappoqypdzj/auth/users')
  }
}

createUser()
