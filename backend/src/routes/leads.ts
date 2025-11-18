import express from 'express'
import { createClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// GET /api/leads
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    
    // Get auth token from header
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { status, source, assigned_to, date_from, date_to } = req.query

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status as string)
    if (source) query = query.eq('source', source as string)
    if (assigned_to) query = query.eq('assigned_to', assigned_to as string)
    if (date_from) query = query.gte('created_at', date_from as string)
    if (date_to) query = query.lte('created_at', date_to as string)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return res.status(500).json({
        error: 'Failed to fetch leads',
        details: error.message,
      })
    }

    res.json({ leads: data })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/leads/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      return res.status(500).json({
        error: 'Failed to update lead',
        details: error.message,
      })
    }

    res.json({ lead: data })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/leads/:id/forward-amo
router.post('/:id/forward-amo', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { id } = req.params

    // Fetch lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Update lead status
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
      return res.status(500).json({
        error: 'Failed to forward lead',
        details: updateError.message,
      })
    }

    // TODO: Actually send to AmoCRM API
    res.json({
      success: true,
      lead: updatedLead,
      message: 'Lead forwarded to AmoCRM (mock)',
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

