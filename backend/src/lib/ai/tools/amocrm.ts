import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolResult } from './index.js'

export const amocrmTools: Anthropic.Tool[] = [
  {
    name: 'call_amocrm_api',
    description: 'Make a direct call to the AmoCRM REST API (/api/v4/). Use for advanced operations like creating contacts, updating deals, fetching pipeline stages, etc. Requires AMOCRM_BASE_URL and AMOCRM_API_KEY to be configured.',
    input_schema: {
      type: 'object' as const,
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PATCH', 'DELETE'],
          description: 'HTTP method',
        },
        path: {
          type: 'string',
          description: 'API path starting with /api/v4/ (e.g. "/api/v4/contacts", "/api/v4/leads")',
        },
        body: {
          type: 'object',
          description: 'Request body for POST/PATCH requests',
        },
        query: {
          type: 'object',
          description: 'Query parameters as key-value pairs',
        },
      },
      required: ['method', 'path'],
    },
  },
]

export async function handleCallAmocrmApi(
  input: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    path: string
    body?: object
    query?: Record<string, string>
  },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const apiKey = process.env.AMOCRM_API_KEY
  const baseUrl = process.env.AMOCRM_BASE_URL

  if (!apiKey || !baseUrl) {
    return {
      success: false,
      error: 'AmoCRM API is not configured. Please set AMOCRM_BASE_URL and AMOCRM_API_KEY in the environment.',
    }
  }

  try {
    let url = `${baseUrl}${input.path}`
    if (input.query) {
      const params = new URLSearchParams(input.query)
      url += `?${params.toString()}`
    }

    const response = await fetch(url, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    })

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
        error: `AmoCRM API returned ${response.status}: ${text.substring(0, 500)}`,
      }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `AmoCRM API request failed: ${message}` }
  }
}
