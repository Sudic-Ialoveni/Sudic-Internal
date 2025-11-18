import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/components/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // TODO: Integrate with actual TaritiGPT API
    // For now, return a mock response
    return NextResponse.json({
      response: `This is a mock response from TaritiGPT. You asked: "${prompt}".\n\nTo integrate with the actual TaritiGPT API, update this endpoint with your API credentials and implementation.`,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

