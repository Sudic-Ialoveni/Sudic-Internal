import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { CLAUDE_MODEL } from './claude.js'

/**
 * Minimal messages call to verify the key. Uses the same model as the app (`CLAUDE_MODEL` / default
 * from claude.ts) so we never reference a retired or unavailable snapshot like an old Haiku ID.
 */
export async function testAnthropicApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey.trim()
  if (!key) return { ok: false, error: 'No API key provided' }
  try {
    const client = new Anthropic({ apiKey: key })
    await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

export async function testOpenAIApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey.trim()
  if (!key) return { ok: false, error: 'No API key provided' }
  try {
    const client = new OpenAI({ apiKey: key })
    await client.models.list()
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
