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

// Schema for lead webhook payload
const LeadWebhookSchema = z.object({
  source: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  message: z.string().optional(),
  raw_payload: z.record(z.any()).optional(),
})

// Optional HMAC validation (implement if you have webhook secrets)
function validateWebhookSignature(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET_LEAD
  if (!secret) {
    // If no secret configured, allow all (not recommended for production)
    return true
  }
  
  // Implement HMAC validation here
  // const signature = request.headers.get('x-signature')
  // ... validate signature
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    if (!validateWebhookSignature(request)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = LeadWebhookSchema.parse(body)

    const supabase = createServiceClient()

    // Insert lead into database
    const { data, error } = await supabase
      .from('leads')
      .insert({
        source: validated.source,
        email: validated.email,
        phone: validated.phone,
        name: validated.name,
        message: validated.message,
        raw_payload: validated.raw_payload || body,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting lead:', error)
      return NextResponse.json(
        { error: 'Failed to insert lead', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, lead: data }, { status: 201 })
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

