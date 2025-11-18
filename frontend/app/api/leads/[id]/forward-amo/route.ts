import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    // Fetch lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // TODO: Implement AmoCRM API integration
    // For now, just update the lead status
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'forwarded',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating lead:', updateError)
      return NextResponse.json(
        { error: 'Failed to forward lead', details: updateError.message },
        { status: 500 }
      )
    }

    // TODO: Actually send to AmoCRM API
    // const amoCrmResponse = await sendToAmoCRM(lead)

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      message: 'Lead forwarded to AmoCRM (mock)',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

