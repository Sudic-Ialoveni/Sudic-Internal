import express from 'express'
import { createClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// GET /api/analytics/amo
router.get('/amo', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { date_from, date_to } = req.query

    let query = supabase
      .from('amocrm_contacts')
      .select('*', { count: 'exact' })

    if (date_from) query = query.gte('synced_at', date_from as string)
    if (date_to) query = query.lte('synced_at', date_to as string)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching AmoCRM analytics:', error)
      return res.status(500).json({
        error: 'Failed to fetch analytics',
        details: error.message,
      })
    }

    res.json({
      total_contacts: count || 0,
      contacts: data,
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/analytics/moizvonki
router.get('/moizvonki', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { date_from, date_to } = req.query

    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })

    if (date_from) query = query.gte('created_at', date_from as string)
    if (date_to) query = query.lte('created_at', date_to as string)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching Moizvonki analytics:', error)
      return res.status(500).json({
        error: 'Failed to fetch analytics',
        details: error.message,
      })
    }

    const totalDuration = data?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0
    const avgDuration = count && count > 0 ? totalDuration / count : 0
    const statusCounts = data?.reduce((acc, call) => {
      const status = call.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    res.json({
      total_calls: count || 0,
      total_duration: totalDuration,
      avg_duration: Math.round(avgDuration),
      status_counts: statusCounts,
      calls: data,
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/analytics/leads
router.get('/leads', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createClient()
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.substring(7)
      await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    }

    const { date_from, date_to } = req.query

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })

    if (date_from) query = query.gte('created_at', date_from as string)
    if (date_to) query = query.lte('created_at', date_to as string)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching lead analytics:', error)
      return res.status(500).json({
        error: 'Failed to fetch analytics',
        details: error.message,
      })
    }

    const statusCounts = data?.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const sourceCounts = data?.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    res.json({
      total_leads: count || 0,
      status_counts: statusCounts,
      source_counts: sourceCounts,
      leads: data,
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

