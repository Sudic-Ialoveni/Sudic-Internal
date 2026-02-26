/**
 * Vercel serverless: catch-all for /api/* (e.g. /api/user/preferences).
 * With framework=vite + outputDirectory, this may not be invoked on Vercel; then use standalone backend or see docs/VERCEL_DEPLOY.md.
 */
import { createApp } from 'sudic-internal-backend/app'

const app = createApp()
export default app
