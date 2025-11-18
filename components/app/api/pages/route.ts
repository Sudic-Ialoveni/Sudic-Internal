import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/components/lib/supabase/server'
import { PageConfigSchema } from '@/components/lib/types/widgets'

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
    const published = searchParams.get('published')

    let query = supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: false })

    if (published === 'true') {
      query = query.eq('published', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching pages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pages', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ pages: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    
    // Validate page config
    const config = PageConfigSchema.parse(body.config)
    
    // Validate slug format
    const slug = body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 
                 body.title?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 
                 `page-${Date.now()}`

    const { data, error } = await supabase
      .from('pages')
      .insert({
        slug,
        title: body.title,
        description: body.description,
        creator: user.id,
        config,
        published: body.published || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating page:', error)
      return NextResponse.json(
        { error: 'Failed to create page', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ page: data }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid page config', details: error.message },
        { status: 400 }
      )
    }

    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

