import express from 'express'
import { createServiceClient } from '../lib/supabase.js'
import { z } from 'zod'

const router = express.Router()

// Webhook validation (basic - implement HMAC if needed)
function validateWebhook(req: express.Request, secretEnvVar: string): boolean {
  const secret = process.env[secretEnvVar]
  if (!secret) return true // Allow if no secret configured
  // TODO: Implement HMAC validation
  return true
}

// Lead webhook schema
const LeadWebhookSchema = z.object({
  source: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  message: z.string().optional(),
  raw_payload: z.record(z.any()).optional(),
})

// POST /api/webhooks/lead
router.post('/lead', async (req, res) => {
  try {
    if (!validateWebhook(req, 'WEBHOOK_SECRET_LEAD')) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const validated = LeadWebhookSchema.parse(req.body)
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('leads')
      .insert({
        source: validated.source,
        email: validated.email,
        phone: validated.phone,
        name: validated.name,
        message: validated.message,
        raw_payload: validated.raw_payload || req.body,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting lead:', error)
      return res.status(500).json({
        error: 'Failed to insert lead',
        details: error.message,
      })
    }

    res.status(201).json({ success: true, lead: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: error.errors,
      })
    }

    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Moizvonki webhook schema
const MoizvonkiWebhookSchema = z.object({
  id: z.string(),
  caller: z.string().optional(),
  callee: z.string().optional(),
  duration: z.number().optional(),
  status: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  raw: z.record(z.any()).optional(),
})

// POST /api/webhooks/moizvonki
router.post('/moizvonki', async (req, res) => {
  try {
    if (!validateWebhook(req, 'WEBHOOK_SECRET_MOIZVONKI')) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const validated = MoizvonkiWebhookSchema.parse(req.body)
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('calls')
      .insert({
        id: validated.id,
        caller: validated.caller,
        callee: validated.callee,
        duration: validated.duration,
        status: validated.status,
        lead_id: validated.lead_id || null,
        raw: validated.raw || req.body,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting call:', error)
      return res.status(500).json({
        error: 'Failed to insert call',
        details: error.message,
      })
    }

    res.status(201).json({ success: true, call: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: error.errors,
      })
    }

    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// AmoCRM webhook schema
const AmoCRMWebhookSchema = z.object({
  id: z.string(),
  data: z.record(z.any()),
})

// POST /api/webhooks/amocrm
router.post('/amocrm', async (req, res) => {
  try {
    if (!validateWebhook(req, 'WEBHOOK_SECRET_AMOCRM')) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    const validated = AmoCRMWebhookSchema.parse(req.body)
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('amocrm_contacts')
      .upsert({
        id: validated.id,
        data: validated.data,
        synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting AmoCRM contact:', error)
      return res.status(500).json({
        error: 'Failed to sync contact',
        details: error.message,
      })
    }

    res.status(200).json({ success: true, contact: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: error.errors,
      })
    }

    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

