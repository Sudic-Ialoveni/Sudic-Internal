import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadFilter } from '@/lib/types/leads'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filter: LeadFilter = {
      status: searchParams.get('status') || undefined,
      source: searchParams.get('source') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    }

    // Build query
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter.status) {
      query = query.eq('status', filter.status)
    }
    if (filter.source) {
      query = query.eq('source', filter.source)
    }
    if (filter.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to)
    }
    if (filter.date_from) {
      query = query.gte('created_at', filter.date_from)
    }
    if (filter.date_to) {
      query = query.lte('created_at', filter.date_to)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ leads: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

