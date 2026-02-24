import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().min(1).optional().or(z.literal('')),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  // AmoCRM (optional – used for AI tools and forwarding leads)
  AMOCRM_BASE_URL: z.string().url().optional().or(z.literal('')),
  AMOCRM_API_KEY: z.string().optional().default(''),
  // Moizvonki (optional – used for AI tools)
  MOIZVONKI_API_KEY: z.string().optional().default(''),
  MOIZVONKI_BASE_URL: z.string().url().optional().or(z.literal('')),
  MOIZVONKI_USER: z.string().optional().default(''),
  // Webhook secrets (optional)
  WEBHOOK_SECRET_AMOCRM: z.string().optional().default(''),
  WEBHOOK_SECRET_MOIZVONKI: z.string().optional().default(''),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.NEXT_PUBLIC_FRONTEND_URL,
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AMOCRM_BASE_URL: process.env.AMOCRM_BASE_URL,
    AMOCRM_API_KEY: process.env.AMOCRM_API_KEY,
    MOIZVONKI_API_KEY: process.env.MOIZVONKI_API_KEY,
    MOIZVONKI_BASE_URL: process.env.MOIZVONKI_BASE_URL,
    MOIZVONKI_USER: process.env.MOIZVONKI_USER,
    WEBHOOK_SECRET_AMOCRM: process.env.WEBHOOK_SECRET_AMOCRM,
    WEBHOOK_SECRET_MOIZVONKI: process.env.WEBHOOK_SECRET_MOIZVONKI,
  }
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    process.exit(1)
  }
  if (!parsed.data.SUPABASE_URL || !parsed.data.SUPABASE_ANON_KEY) {
    console.warn('⚠️ SUPABASE_URL and SUPABASE_ANON_KEY are missing; auth and DB will not work.')
  }
  return parsed.data
}

export const env = loadEnv()
