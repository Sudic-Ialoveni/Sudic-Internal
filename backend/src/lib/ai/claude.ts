import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
export const MAX_TOKENS = 4096

const clients = new Map<string, Anthropic>()

/**
 * @param userApiKey - optional per-user key from Settings; if omitted, uses ANTHROPIC_API_KEY from env.
 */
export function getClaudeClient(userApiKey?: string | null): Anthropic {
  const apiKey = (userApiKey?.trim() || process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    throw new Error(
      'No Anthropic API key. Add your key in Settings → AI, or set ANTHROPIC_API_KEY on the server.',
    )
  }
  let c = clients.get(apiKey)
  if (!c) {
    c = new Anthropic({ apiKey })
    clients.set(apiKey, c)
  }
  return c
}
