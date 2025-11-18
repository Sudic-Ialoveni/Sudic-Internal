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

const MoizvonkiWebhookSchema = z.object({
  id: z.string(),
  caller: z.string().optional(),
  callee: z.string().optional(),
  duration: z.number().optional(),
  status: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  raw: z.record(z.any()).optional(),
})

function validateWebhookSignature(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET_MOIZVONKI
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
    const validated = MoizvonkiWebhookSchema.parse(body)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('calls')
      .insert({
        id: validated.id,
        caller: validated.caller,
        callee: validated.callee,
        duration: validated.duration,
        status: validated.status,
        lead_id: validated.lead_id || null,
        raw: validated.raw || body,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting call:', error)
      return NextResponse.json(
        { error: 'Failed to insert call', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, call: data }, { status: 201 })
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

