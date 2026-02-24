/**
 * Vercel serverless handler: forwards all /api and /health requests to the Express app.
 * Backend must be built first (npm run build from repo root).
 */
// @ts-ignore - resolved at build time from backend/dist
import { createApp } from '../backend/dist/app.js'

const app = createApp()

export default app
