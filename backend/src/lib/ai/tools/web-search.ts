import Anthropic from '@anthropic-ai/sdk'
import type { ToolContext, ToolResult } from './index.js'

export const webSearchTools: Anthropic.Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Tries DuckDuckGo first for instant answers, then falls back to a full web search (SearXNG) for general queries. Free — no API key required. Good for factual queries, market info, news, and research.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'The search query — be specific for better results',
        },
      },
      required: ['query'],
    },
  },
]

interface DDGRelatedTopic {
  Text?: string
  FirstURL?: string
  Topics?: DDGRelatedTopic[]
}

interface DDGResponse {
  Abstract?: string
  AbstractSource?: string
  AbstractURL?: string
  Answer?: string
  AnswerType?: string
  Definition?: string
  DefinitionSource?: string
  DefinitionURL?: string
  Heading?: string
  RelatedTopics?: DDGRelatedTopic[]
  Results?: Array<{ Text: string; FirstURL: string }>
  Type?: string
}

// SearXNG result (public instances, no API key) — try multiple for reliability
const SEARXNG_INSTANCES = [
  'https://search.bus-hit.me',
  'https://searx.be',
  'https://searx.work',
  'https://searx.tiekoetter.com',
]

interface SearXNGResult {
  title?: string
  url?: string
  content?: string
  engine?: string
}

interface SearXNGResponse {
  results?: SearXNGResult[]
  query?: string
}

const SEARXNG_TIMEOUT_MS = 6000

async function searchSearXNG(query: string): Promise<ToolResult> {
  const encoded = encodeURIComponent(query)
  for (const base of SEARXNG_INSTANCES) {
    try {
      const url = `${base}/search?q=${encoded}&format=json&language=all`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Sudic-Internal/1.0 (web search)' },
        signal: AbortSignal.timeout(SEARXNG_TIMEOUT_MS),
      })
      if (!res.ok) continue
      const data = await res.json() as SearXNGResponse
      const results = data.results?.slice(0, 8).map(r => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: (r.content ?? '').slice(0, 200),
      })) ?? []
      if (results.length === 0) continue
      return {
        success: true,
        data: {
          query: data.query ?? query,
          source: 'searxng',
          results,
          count: results.length,
        },
      }
    } catch {
      continue
    }
  }
  // Don't fail the tool — return success with empty results so the model can say "no results" instead of "error"
  return {
    success: true,
    data: {
      query,
      source: 'none',
      results: [],
      count: 0,
      note: 'DuckDuckGo had no instant answer and SearXNG instances were unavailable or timed out. Suggest rephrasing the query or trying again later.',
    },
  }
}

export async function handleWebSearch(
  input: { query: string },
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const params = new URLSearchParams({
      q: input.query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1',
      t: 'sudic-internal',
    })

    const response = await fetch(
      `https://api.duckduckgo.com/?${params}`,
      {
        headers: {
          'User-Agent': 'Sudic-Internal/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      },
    )

    if (!response.ok) {
      return searchSearXNG(input.query)
    }

    const data = await response.json() as DDGResponse

    const result: Record<string, unknown> = {
      query: input.query,
      source: 'duckduckgo',
    }

    if (data.Answer) {
      result.instant_answer = data.Answer
      result.answer_type = data.AnswerType
    }

    if (data.Abstract) {
      result.summary = data.Abstract
      result.source_name = data.AbstractSource
      result.source_url = data.AbstractURL
    }

    if (data.Definition) {
      result.definition = data.Definition
      result.definition_source = data.DefinitionSource
    }

    if (data.Heading) result.topic = data.Heading

    const flattenTopics = (topics: DDGRelatedTopic[]): Array<{ text: string; url: string }> => {
      const out: Array<{ text: string; url: string }> = []
      for (const t of topics) {
        if (t.Text && t.FirstURL) out.push({ text: t.Text, url: t.FirstURL })
        if (t.Topics) out.push(...flattenTopics(t.Topics))
      }
      return out
    }

    if (data.RelatedTopics?.length) {
      result.related = flattenTopics(data.RelatedTopics).slice(0, 8)
    }

    if (data.Results?.length) {
      result.results = data.Results.slice(0, 5).map(r => ({ text: r.Text, url: r.FirstURL }))
    }

    const hasContent =
      result.instant_answer != null ||
      result.summary != null ||
      result.definition != null ||
      (result.related as unknown[] | undefined)?.length ||
      (result.results as unknown[] | undefined)?.length

    if (hasContent) {
      return { success: true, data: result }
    }

    // DuckDuckGo had nothing — fall back to full web search
    return searchSearXNG(input.query)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Web search failed: ${message}` }
  }
}
