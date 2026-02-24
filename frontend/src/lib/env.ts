import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  VITE_BACKEND_URL: z.string().url().optional().default('http://localhost:3001'),
})

const raw = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
}

const parsed = envSchema.safeParse(raw)
if (!parsed.success && import.meta.env.DEV) {
  console.warn('[env] Invalid or missing env:', parsed.error.flatten().fieldErrors)
}

export const env = parsed.success ? parsed.data : {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_BACKEND_URL: 'http://localhost:3001',
}

export const hasEnvVars = !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
