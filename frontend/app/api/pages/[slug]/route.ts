import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PageConfigSchema } from '@/lib/types/widgets'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    const { slug } = params

    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching page:', error)
      return NextResponse.json(
        { error: 'Failed to fetch page', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ page: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    const { slug } = params
    const body = await request.json()

    // If config is provided, validate it
    if (body.config) {
      PageConfigSchema.parse(body.config)
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.title) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.config) updateData.config = body.config
    if (body.published !== undefined) updateData.published = body.published

    const { data, error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      console.error('Error updating page:', error)
      return NextResponse.json(
        { error: 'Failed to update page', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ page: data })
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

