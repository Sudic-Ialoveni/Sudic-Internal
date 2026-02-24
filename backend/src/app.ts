import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import webhookRoutes from './routes/webhooks.js'
import leadsRoutes from './routes/leads.js'
import pagesRoutes from './routes/pages.js'
import analyticsRoutes from './routes/analytics.js'
import taritiGptRoutes from './routes/tariti-gpt.js'
import aiRoutes from './routes/ai.js'
import chatRoutes from './routes/chats.js'
import userRoutes from './routes/user.js'
import devRoutes from './routes/dev.js'
import externalApiRoutes from './routes/external-api.js'
import { createServiceClient } from './lib/supabase.js'

/**
 * Create and configure the Express app (no listen).
 * Used by index.ts for local server and by Vercel serverless handler.
 */
export function createApp(): express.Express {
  const app = express()

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  }))

  app.use(pinoHttp({
    logger,
    genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} - ${err?.message}`,
  }))

  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }))
  app.use(express.json())

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests; try again later.' },
  })
  const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many chat requests; try again later.' },
  })

  app.use('/api', apiLimiter)
  app.use('/api/ai/chat', chatLimiter)
  app.use('/api/ai/approve', chatLimiter)

  const healthHandler = async (
    _req: express.Request,
    res: express.Response,
  ) => {
    const result: { status: string; timestamp: string; supabase?: string } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
    try {
      const supabase = createServiceClient()
      const { error } = await supabase.from('pages').select('id').limit(1).maybeSingle()
      result.supabase = error ? 'degraded' : 'ok'
    } catch {
      result.supabase = 'degraded'
    }
    const statusCode = result.supabase === 'degraded' ? 503 : 200
    res.status(statusCode).json(result)
  }
  app.get('/health', healthHandler)
  app.get('/api/health', healthHandler)

  app.use('/api/webhooks', webhookRoutes)
  app.use('/api/leads', leadsRoutes)
  app.use('/api/pages', pagesRoutes)
  app.use('/api/analytics', analyticsRoutes)
  app.use('/api/tariti-gpt', taritiGptRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/ai', chatRoutes)
  app.use('/api/user', userRoutes)
  app.use('/api/dev', devRoutes)
  app.use('/api/external-api', externalApiRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = (err as { status?: number }).status ?? 500
    const log = (req as express.Request & { log?: { error: (o: object, s: string) => void } }).log
    if (log) log.error({ err }, message)
    else logger.error({ err }, message)
    res.status(status).json({
      error: message,
      ...(env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack }),
    })
  })

  return app
}
