import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

/** Small, cheap validation call — model must exist on the account. */
const ANTHROPIC_TEST_MODEL = 'claude-3-5-haiku-20241022'

export async function testAnthropicApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey.trim()
  if (!key) return { ok: false, error: 'No API key provided' }
  try {
    const client = new Anthropic({ apiKey: key })
    await client.messages.create({
      model: ANTHROPIC_TEST_MODEL,
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
