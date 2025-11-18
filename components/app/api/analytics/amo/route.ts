import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/components/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    let query = supabase
      .from('amocrm_contacts')
      .select('*', { count: 'exact' })

    if (dateFrom) {
      query = query.gte('synced_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('synced_at', dateTo)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching AmoCRM analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: error.message },
        { status: 500 }
      )
    }

    // TODO: Add more sophisticated analytics calculations
    return NextResponse.json({
      total_contacts: count || 0,
      contacts: data,
      // Add more metrics as needed
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

