import { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from '../lib/supabase.js'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
    [key: string]: any
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  
  const user = await getAuthenticatedUser(authHeader)
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = user
  next()
}

