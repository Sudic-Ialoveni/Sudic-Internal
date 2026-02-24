/**
 * Script to manage user accounts directly via Supabase Admin API
 * Bypasses the broken Supabase Dashboard
 * 
 * Usage:
 *   npx tsx src/scripts/manage-user.ts check
 *   npx tsx src/scripts/manage-user.ts confirm
 *   npx tsx src/scripts/manage-user.ts reset-password
 *   npx tsx src/scripts/manage-user.ts list
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EMAIL = 'sudic.md@gmail.com'
const PASSWORD = 'Teodor@2011'

async function checkUser() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // List all users and find ours
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Error listing users:', error.message)
      return
    }

    const user = users.find(u => u.email === EMAIL)
    
    if (!user) {
      console.log('❌ User not found:', EMAIL)
      console.log('\nTo create user, run:')
      console.log('  npx tsx src/scripts/create-user.ts')
      return
    }

    console.log('✅ User found!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('ID:', user.id)
    console.log('Email:', user.email)
    console.log('Email Confirmed:', user.email_confirmed_at ? '✅ YES' : '❌ NO')
    console.log('Created:', user.created_at)
    console.log('Last Sign In:', user.last_sign_in_at || 'Never')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (!user.email_confirmed_at) {
      console.log('\n⚠️  Email is NOT confirmed!')
      console.log('Run: npx tsx src/scripts/manage-user.ts confirm')
    } else {
      console.log('\n✅ Email is confirmed - user can log in!')
    }
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
}

async function confirmEmail() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // Find user first
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('❌ Error finding user:', listError.message)
      return
    }

    const user = users.find(u => u.email === EMAIL)
    if (!user) {
      console.error('❌ User not found:', EMAIL)
      return
    }

    // Update user to confirm email
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (error) {
      console.error('❌ Error confirming email:', error.message)
      return
    }

    console.log('✅ Email confirmed successfully!')
    console.log('User can now log in at http://localhost:3000/login')
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
}

async function resetPassword() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // Find user first
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error('❌ Error finding user:', listError.message)
      return
    }

    const user = users.find(u => u.email === EMAIL)
    if (!user) {
      console.error('❌ User not found:', EMAIL)
      return
    }

    // Update password
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
    })

    if (error) {
      console.error('❌ Error resetting password:', error.message)
      return
    }

    console.log('✅ Password reset successfully!')
    console.log('New password:', PASSWORD)
    console.log('User can now log in at http://localhost:3000/login')
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
}

async function listUsers() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Error listing users:', error.message)
      return
    }

    console.log(`\n📋 Found ${users.length} user(s):\n`)
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Confirmed: ${user.email_confirmed_at ? '✅' : '❌'}`)
      console.log(`   Created: ${user.created_at}`)
      console.log('')
    })
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
  }
}

// Main
const command = process.argv[2] || 'check'

switch (command) {
  case 'check':
    checkUser()
    break
  case 'confirm':
    confirmEmail()
    break
  case 'reset-password':
    resetPassword()
    break
  case 'list':
    listUsers()
    break
  default:
    console.log('Usage:')
    console.log('  npx tsx src/scripts/manage-user.ts check          - Check user status')
    console.log('  npx tsx src/scripts/manage-user.ts confirm         - Confirm user email')
    console.log('  npx tsx src/scripts/manage-user.ts reset-password  - Reset password')
    console.log('  npx tsx src/scripts/manage-user.ts list            - List all users')
}

