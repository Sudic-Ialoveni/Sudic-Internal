import express from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'

const router = express.Router()

// POST /api/tariti-gpt
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    // TODO: Integrate with actual TaritiGPT API
    // For now, return a mock response
    res.json({
      response: `This is a mock response from TaritiGPT. You asked: "${prompt}".\n\nTo integrate with the actual TaritiGPT API, update this endpoint with your API credentials and implementation.`,
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

