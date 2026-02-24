import express from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { handleCallAmocrmApi } from '../lib/ai/tools/amocrm.js'
import { moizvonkiRequest } from '../lib/external-api/moizvonki.js'
import { allTools, executeTool, isRiskyTool } from '../lib/ai/tools/index.js'

const router = express.Router()

// All dev routes require auth
router.use(requireAuth)

// GET /api/dev/status - which external APIs are configured (no secrets)
router.get('/status', (_req: AuthenticatedRequest, res) => {
  const amocrm = !!(process.env.AMOCRM_BASE_URL && process.env.AMOCRM_API_KEY)
  const moizvonki = !!process.env.MOIZVONKI_API_KEY
  res.json({ amocrm, moizvonki })
})

// POST /api/dev/amocrm - test AmoCRM API call
router.post('/amocrm', async (req: AuthenticatedRequest, res) => {
  try {
    const { method, path, body, query } = req.body as {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
      path?: string
      body?: object
      query?: Record<string, string>
    }
    if (!method || !path) {
      return res.status(400).json({ error: 'method and path are required' })
    }
    const result = await handleCallAmocrmApi(
      { method, path, body, query },
      { authToken: '', userId: req.user!.id },
    )
    return res.json(result)
  } catch (err) {
    console.error('Dev AmoCRM request error:', err)
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Request failed',
    })
  }
})

// POST /api/dev/moizvonki - test Moizvonki API call (single POST with action + params per API docs)
router.post('/moizvonki', async (req: AuthenticatedRequest, res) => {
  try {
    const { action, params } = req.body as {
      action?: string
      params?: Record<string, unknown>
    }
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action is required (e.g. calls.list, calls.get_sms_templates)' })
    }
    const result = await moizvonkiRequest(action, params ?? {})
    if (result.success) {
      return res.json({ success: true, data: result.data })
    }
    return res.json({ success: false, error: result.error })
  } catch (err) {
    console.error('Dev Moizvonki request error:', err)
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Request failed',
    })
  }
})

// GET /api/dev/tools - list all tools with full schema (for manual testing)
router.get('/tools', (_req: AuthenticatedRequest, res) => {
  try {
    const tools = allTools.map((t) => {
      const tool = t as { name: string; description?: string; input_schema?: object }
      return {
        name: tool.name,
        description: tool.description ?? '',
        risky: isRiskyTool(tool.name),
        input_schema: tool.input_schema ?? {},
      }
    })
    res.json({ tools })
  } catch (err) {
    console.error('Dev tools list error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load tools' })
  }
})

// POST /api/dev/tools/execute - run a single tool with given input
router.post('/tools/execute', async (req: AuthenticatedRequest, res) => {
  try {
    const { toolName, toolInput } = req.body as { toolName?: string; toolInput?: Record<string, unknown> }
    if (!toolName || typeof toolInput !== 'object') {
      return res.status(400).json({ error: 'toolName and toolInput (object) are required' })
    }
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const result = await executeTool(toolName, toolInput ?? {}, {
      authToken: token,
      userId: req.user!.id,
    })
    return res.json(result)
  } catch (err) {
    console.error('Dev tool execute error:', err)
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Execution failed',
    })
  }
})

export default router
