/**
 * Moizvonki API client.
 * API: single POST to https://[domain].moizvonki.ru/api/v1 with JSON body
 * { user_name, api_key, action, ...params }. See https://www.moizvonki.ru/guide/api/
 */

const DEFAULT_BASE_URL = 'https://app.moizvonki.ru/api/v1'

function getConfig(): { baseUrl: string; user: string; apiKey: string } | null {
  const apiKey = process.env.MOIZVONKI_API_KEY
  const user = process.env.MOIZVONKI_USER ?? ''
  const baseUrl = process.env.MOIZVONKI_BASE_URL || DEFAULT_BASE_URL
  if (!apiKey) return null
  return { baseUrl, user, apiKey }
}

export function isMoizvonkiConfigured(): boolean {
  return getConfig() != null
}

/** Single POST request with action + params */
export async function moizvonkiRequest<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const config = getConfig()
  if (!config) {
    return { success: false, error: 'Moizvonki API is not configured. Set MOIZVONKI_API_KEY and MOIZVONKI_USER.' }
  }

  const body = {
    user_name: config.user,
    api_key: config.apiKey,
    action,
    ...params,
  }

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    let data: T
    try {
      data = JSON.parse(text) as T
    } catch {
      if (!response.ok) {
        return { success: false, error: `Moizvonki API returned ${response.status}: ${text.substring(0, 500)}` }
      }
      return { success: false, error: `Invalid JSON response: ${text.substring(0, 200)}` }
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Moizvonki API returned ${response.status}: ${typeof data === 'object' && data != null && 'error' in data ? String((data as { error?: string }).error) : text.substring(0, 500)}`,
      }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Moizvonki request failed: ${message}` }
  }
}

// Typed helpers for registry/resolver

export async function callsList(params: {
  from_id?: number
  from_date?: number
  to_date?: number
  from_offset?: number
  max_results?: number
  supervised?: 0 | 1
} = {}): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return moizvonkiRequest('calls.list', params as Record<string, unknown>)
}

export async function getSmsTemplates(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return moizvonkiRequest('calls.get_sms_templates')
}

export async function listEmployee(params: {
  max_results?: number
  from_offset?: number
  employee_user_name?: string
  employee_id?: number
} = {}): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return moizvonkiRequest('company.list_employee', params as Record<string, unknown>)
}

export async function listGroup(params: {
  max_results?: number
  from_offset?: number
} = {}): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return moizvonkiRequest('company.list_group', params as Record<string, unknown>)
}

export async function webhookList(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return moizvonkiRequest('webhook.list')
}
