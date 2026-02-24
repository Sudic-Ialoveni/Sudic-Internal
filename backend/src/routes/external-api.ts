import express from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { getAllVariables } from '../lib/external-api/registry.js'
import { resolve } from '../lib/external-api/resolver.js'

const router = express.Router()

router.use(requireAuth)

/** GET /api/external-api/variables — list all variables for debug page */
router.get('/variables', (_req: AuthenticatedRequest, res) => {
  try {
    const variables = getAllVariables().map((v) => ({
      id: v.id,
      description: v.description,
      source: v.source,
      entity: v.entity,
      requiredParams: v.requiredParams,
      optionalParams: v.optionalParams,
      examplePath: v.examplePath,
    }))
    res.json({ variables })
  } catch (err) {
    console.error('External API variables error:', err)
    res.status(500).json({ error: 'Failed to load variables' })
  }
})

/** POST /api/external-api/resolve — resolve a path or structured reference */
router.post('/resolve', async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as {
      path?: string
      source?: 'amocrm' | 'moizvonki'
      entity?: string
      id?: string
      field?: string
      params?: Record<string, unknown>
    }
    const result = await resolve({
      path: body.path,
      source: body.source,
      entity: body.entity,
      id: body.id,
      field: body.field,
      params: body.params,
    })
    res.json(result)
  } catch (err) {
    console.error('External API resolve error:', err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Resolve failed',
    })
  }
})

export default router
