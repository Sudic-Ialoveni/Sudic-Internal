import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/components/lib/types/database'
import { z } from 'zod'

function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

const AmoCRMWebhookSchema = z.object({
  id: z.string(),
  data: z.record(z.any()),
})

function validateWebhookSignature(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET_AMOCRM
  if (!secret) return true
  // Implement HMAC validation
  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = AmoCRMWebhookSchema.parse(body)

    const supabase = createServiceClient()

    // Upsert contact (update if exists, insert if not)
    const { data, error } = await supabase
      .from('amocrm_contacts')
      .upsert({
        id: validated.id,
        data: validated.data,
        synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting AmoCRM contact:', error)
      return NextResponse.json(
        { error: 'Failed to sync contact', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contact: data }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

