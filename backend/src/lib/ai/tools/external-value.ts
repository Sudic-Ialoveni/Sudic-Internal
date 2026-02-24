import Anthropic from '@anthropic-ai/sdk'
import { resolve } from '../../external-api/resolver.js'
import type { ToolContext, ToolResult } from './index.js'

export const externalValueTools: Anthropic.Tool[] = [
  {
    name: 'get_external_value',
    description: 'Get a value from AmoCRM or Moizvonki by path. You request what you need by path; the backend performs the API call. Use path format: source.entity or source.entity(id).field. Examples: amocrm.account, amocrm.pipelines, amocrm.lead(123), amocrm.lead(123).potential_amount, amocrm.contacts_list, moizvonki.calls_list, moizvonki.sms_templates, moizvonki.employees. Optional params (e.g. from_date, to_date for moizvonki.calls_list) can be passed in the params object. See the debug page (Dev > External API) for the full list of variables.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Variable path, e.g. amocrm.lead(123).potential_amount or moizvonki.calls_list',
        },
        params: {
          type: 'object',
          description: 'Optional parameters. For lists: limit (default 25, max 250), page, compact (true = slim items + _meta with total/has_more). For filters: from_date, to_date, query, etc. per variable.',
        },
      },
      required: ['path'],
    },
  },
]

export async function handleGetExternalValue(
  input: { path: string; params?: Record<string, unknown> },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const result = await resolve({
    path: input.path,
    params: input.params,
  })
  if (result.success) {
    return { success: true, data: result.value }
  }
  return { success: false, error: result.error }
}
