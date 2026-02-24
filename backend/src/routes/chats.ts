import express from 'express'
import { createServiceClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { randomBytes } from 'node:crypto'

const router = express.Router()

// GET /api/ai/chats — list current user's chats
router.get('/chats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.user!.id)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json({ chats: data ?? [] })
  } catch (err: unknown) {
    console.error('List chats error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list chats' })
  }
})

// POST /api/ai/chats — create a new chat
router.post('/chats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const title = (req.body.title as string)?.trim() || 'New chat'
    const { data, error } = await supabase
      .from('ai_chats')
      .insert({
        user_id: req.user!.id,
        title,
        messages: [],
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ chat: data })
  } catch (err: unknown) {
    console.error('Create chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create chat' })
  }
})

// GET /api/ai/chats/:id — get one chat with messages
router.get('/chats/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Chat not found' })
    res.json({ chat: data })
  } catch (err: unknown) {
    console.error('Get chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load chat' })
  }
})

// PATCH /api/ai/chats/:id — update title and/or messages
router.patch('/chats/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof req.body.title === 'string') updates.title = req.body.title.trim() || 'New chat'
    if (Array.isArray(req.body.messages)) updates.messages = req.body.messages

    const { data, error } = await supabase
      .from('ai_chats')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Chat not found' })
    res.json({ chat: data })
  } catch (err: unknown) {
    console.error('Update chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update chat' })
  }
})

// DELETE /api/ai/chats/:id
router.delete('/chats/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('ai_chats')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)

    if (error) throw error
    res.status(204).send()
  } catch (err: unknown) {
    console.error('Delete chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete chat' })
  }
})

// POST /api/ai/chats/:id/share — generate share token
router.post('/chats/:id/share', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const token = randomBytes(16).toString('hex')
    const { data, error } = await supabase
      .from('ai_chats')
      .update({
        share_token: token,
        share_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Chat not found' })
    res.json({ share_token: token, share_url: `/tariti-gpt/shared/${token}` })
  } catch (err: unknown) {
    console.error('Share chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to share chat' })
  }
})

// GET /api/ai/chats/shared/:token — get shared chat (no auth)
router.get('/chats/shared/:token', async (req, res) => {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('ai_chats')
      .select('id, title, messages, share_created_at')
      .eq('share_token', req.params.token)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Shared chat not found or expired' })
    res.json({ chat: data, shared: true })
  } catch (err: unknown) {
    console.error('Get shared chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load shared chat' })
  }
})

export default router
