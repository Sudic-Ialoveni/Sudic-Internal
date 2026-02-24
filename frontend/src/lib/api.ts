import { supabase } from '@/lib/supabase/client'
import { env } from '@/lib/env'

const BASE_URL = env.VITE_BACKEND_URL

export type ApiError = { message: string; status: number }

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

function getRedirectPath(): string {
  const { pathname } = window.location
  return pathname && pathname !== '/login' ? pathname : '/'
}

/**
 * Central API client: base URL, auth token, 401 → redirect to login.
 * Use for JSON APIs. For streaming (e.g. SSE) use apiFetchStream or raw fetch with getToken().
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && (options.body === undefined || typeof options.body === 'string')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    await supabase.auth.signOut()
    const redirect = getRedirectPath()
    window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message = body?.error ?? body?.details ?? `HTTP ${res.status}`
    throw Object.assign(new Error(typeof message === 'string' ? message : JSON.stringify(message)), {
      status: res.status,
    } as ApiError)
  }

  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) return res.json() as Promise<T>
  return res as unknown as T
}

/** For POST/PATCH with JSON body. */
export async function apiPost<T = unknown>(path: string, body: object): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export async function apiPatch<T = unknown>(path: string, body: object): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

/** Get auth token (for SSE or custom fetch). */
export { getToken }

/** Backend base URL. */
export function apiBaseUrl(): string {
  return BASE_URL
}

/** Full URL for an API path (e.g. apiUrl('/api/ai/chat')). */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}