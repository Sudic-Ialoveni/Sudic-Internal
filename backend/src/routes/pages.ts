import express from 'express'
import { createClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { PageConfigSchema } from '../lib/types/widgets.js'

const router = express.Router()

// GET /api/pages
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { published } = req.query

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
      return res.status(500).json({
        error: 'Failed to fetch pages',
        details: error.message,
      })
    }

    res.json({ pages: data })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/pages
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const config = PageConfigSchema.parse(req.body.config)
    
    const slug = req.body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
                 req.body.title?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
                 `page-${Date.now()}`

    const { data, error } = await supabase
      .from('pages')
      .insert({
        slug,
        title: req.body.title,
        description: req.body.description,
        creator: req.user!.id,
        config,
        published: req.body.published || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating page:', error)
      return res.status(500).json({
        error: 'Failed to create page',
        details: error.message,
      })
    }

    res.status(201).json({ page: data })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid page config',
        details: error.message,
      })
    }

    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/pages/:slug
router.get('/:slug', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { slug } = req.params

    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Page not found' })
      }
      console.error('Error fetching page:', error)
      return res.status(500).json({
        error: 'Failed to fetch page',
        details: error.message,
      })
    }

    res.json({ page: data })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/pages/:slug
router.put('/:slug', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { slug } = req.params

    // If config is provided, validate it
    if (req.body.config) {
      PageConfigSchema.parse(req.body.config)
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (req.body.title) updateData.title = req.body.title
    if (req.body.description !== undefined) updateData.description = req.body.description
    if (req.body.config) updateData.config = req.body.config
    if (req.body.published !== undefined) updateData.published = req.body.published

    const { data, error } = await supabase
      .from('pages')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      console.error('Error updating page:', error)
      return res.status(500).json({
        error: 'Failed to update page',
        details: error.message,
      })
    }

    res.json({ page: data })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid page config',
        details: error.message,
      })
    }

    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

