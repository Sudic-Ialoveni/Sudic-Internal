/**
 * Vercel serverless handler: forwards all /api and /health requests to the Express app.
 */
// @ts-expect-error - sudic-internal-backend is a local file: dependency, resolved at runtime
import { createApp } from 'sudic-internal-backend/app'

const app = createApp()

export default app
