import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolResult } from './index.js'

export const moizvonkiTools: Anthropic.Tool[] = [
  {
    name: 'call_moizvonki_api',
    description: 'Make a direct call to the Moizvonki REST API for detailed call data, recordings, or configuration. Requires MOIZVONKI_API_KEY to be configured.',
    input_schema: {
      type: 'object' as const,
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST'],
          description: 'HTTP method',
        },
        endpoint: {
          type: 'string',
          description: 'API endpoint (e.g. "/calls", "/statistics", "/users")',
        },
        params: {
          type: 'object',
          description: 'Query or body parameters as key-value pairs',
        },
      },
      required: ['method', 'endpoint'],
    },
  },
]

export async function handleCallMoizvonkiApi(
  input: {
    method: 'GET' | 'POST'
    endpoint: string
    params?: Record<string, string>
  },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const apiKey = process.env.MOIZVONKI_API_KEY
  const baseUrl = process.env.MOIZVONKI_BASE_URL || 'https://app.moizvonki.ru/api/v1'

  if (!apiKey) {
    return {
      success: false,
      error: 'Moizvonki API is not configured. Please set MOIZVONKI_API_KEY in the environment.',
    }
  }

  try {
    let url = `${baseUrl}${input.endpoint}`
    const fetchOptions: RequestInit = {
      method: input.method,
      headers: {
        'user_name': process.env.MOIZVONKI_USER || '',
        'api_key': apiKey,
        'Content-Type': 'application/json',
      },
    }

    if (input.method === 'GET' && input.params) {
      const queryParams = new URLSearchParams(input.params)
      url += `?${queryParams.toString()}`
    } else if (input.method === 'POST' && input.params) {
      fetchOptions.body = JSON.stringify(input.params)
    }

    const response = await fetch(url, fetchOptions)

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Moizvonki API returned ${response.status}: ${text.substring(0, 500)}`,
      }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Moizvonki API request failed: ${message}` }
  }
}
