import 'dotenv/config'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { createApp } from './app.js'

const app = createApp()

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Backend server running')
  logger.info({ health: `http://localhost:${env.PORT}/health` }, 'Health check')
})
