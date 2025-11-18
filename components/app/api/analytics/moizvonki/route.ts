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
      .from('calls')
      .select('*', { count: 'exact' })

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching Moizvonki analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: error.message },
        { status: 500 }
      )
    }

    // Calculate metrics
    const totalDuration = data?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0
    const avgDuration = count && count > 0 ? totalDuration / count : 0
    const statusCounts = data?.reduce((acc, call) => {
      const status = call.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      total_calls: count || 0,
      total_duration: totalDuration,
      avg_duration: Math.round(avgDuration),
      status_counts: statusCounts,
      calls: data,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

