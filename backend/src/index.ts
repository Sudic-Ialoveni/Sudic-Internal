import express from 'express'
import cors from 'cors'
import webhookRoutes from './routes/webhooks.js'
import leadsRoutes from './routes/leads.js'
import pagesRoutes from './routes/pages.js'
import analyticsRoutes from './routes/analytics.js'
import taritiGptRoutes from './routes/tariti-gpt.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/webhooks', webhookRoutes)
app.use('/api/leads', leadsRoutes)
app.use('/api/pages', pagesRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/tariti-gpt', taritiGptRoutes)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/health`)
})

