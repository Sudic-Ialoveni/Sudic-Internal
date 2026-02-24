/**
 * AmoCRM API client (REST API v4).
 * Uses AMOCRM_BASE_URL and AMOCRM_API_KEY. Endpoints: /api/v4/account, /api/v4/leads, etc.
 * List methods apply a default limit and cap at MAX_LIST_LIMIT to avoid huge responses.
 */

import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './constants.js'

function getConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.AMOCRM_BASE_URL
  const apiKey = process.env.AMOCRM_API_KEY
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey }
}

export function isAmocrmConfigured(): boolean {
  return getConfig() != null
}

async function request<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: object; query?: Record<string, string> } = {},
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const config = getConfig()
  if (!config) {
    return { success: false, error: 'AmoCRM API is not configured. Set AMOCRM_BASE_URL and AMOCRM_API_KEY.' }
  }

  let url = `${config.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  if (options.query && Object.keys(options.query).length > 0) {
    url += `?${new URLSearchParams(options.query).toString()}`
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const text = await response.text()
    let data: T
    try {
      data = (text ? JSON.parse(text) : undefined) as T
    } catch {
      if (!response.ok) {
        return { success: false, error: `AmoCRM API returned ${response.status}: ${text.substring(0, 500)}` }
      }
      return { success: false, error: `Invalid JSON response` }
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
    return { success: false, error: `AmoCRM request failed: ${message}` }
  }
}

const v4 = (path: string) => (path.startsWith('/api/v4') ? path : `/api/v4${path.startsWith('/') ? path : `/${path}`}`)

export async function getAccount(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4('/account'))
}

export async function getPipelines(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4('/leads/pipelines'))
}

export async function getLeadsList(query: { limit?: number; page?: number; query?: string } = {}): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  if (query.query != null) q.query = query.query
  return request('GET', v4('/leads'), { query: q })
}

export async function getLead(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/leads/${id}`))
}

export async function getContactsList(query: { limit?: number; page?: number; query?: string } = {}): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  if (query.query != null) q.query = query.query
  return request('GET', v4('/contacts'), { query: q })
}

export async function getContact(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/contacts/${id}`))
}

export async function getCompaniesList(query: { limit?: number; page?: number; query?: string } = {}): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  if (query.query != null) q.query = query.query
  return request('GET', v4('/companies'), { query: q })
}

export async function getCompany(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/companies/${id}`))
}

export async function getUsers(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4('/users'))
}

/** Parse YYYY-MM-DD to Unix timestamp (start or end of day UTC). */
function dateStringToUnix(dateStr: string, endOfDay: boolean): number {
  const d = new Date(dateStr + (endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'))
  return Math.floor(d.getTime() / 1000)
}

/** When fetching by date range we paginate with order[complete_till]=asc; cap pages so we don't run forever (e.g. 80×250 = 20k tasks). */
const MAX_TASK_DATE_PAGES = 80

/** AmoCRM v4 tasks: filter[is_completed], filter[task_type_id], order[complete_till]. When filter_date_from + filter_date_to are set we do not rely on API date filters (unreliable); we order by complete_till asc and paginate until we collect all tasks whose complete_till falls in that range. */
export async function getTasksList(query: {
  limit?: number
  page?: number
  filter_date_from?: number | string
  filter_date_to?: number | string
  filter_is_completed?: 0 | 1
  filter_task_type_id?: number | number[]
} = {}): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const requestedLimit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)

  let fromTs: number | undefined
  let toTs: number | undefined
  if (query.filter_date_from != null) {
    const v = query.filter_date_from
    fromTs = typeof v === 'number' ? v : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? dateStringToUnix(String(v), false) : undefined
  }
  if (query.filter_date_to != null) {
    const v = query.filter_date_to
    toTs = typeof v === 'number' ? v : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? dateStringToUnix(String(v), true) : undefined
  }
  const haveDateRange = fromTs != null && toTs != null

  if (haveDateRange) {
    const collected: Record<string, unknown>[] = []
    const limit = Math.min(MAX_LIST_LIMIT, 250)
    let page = 1
    let hasMore = true
    while (hasMore && page <= MAX_TASK_DATE_PAGES) {
      const q: Record<string, string> = {
        limit: String(limit),
        page: String(page),
        'order[complete_till]': 'asc',
      }
      if (query.filter_is_completed != null) q['filter[is_completed]'] = String(query.filter_is_completed)
      if (query.filter_task_type_id != null) {
        const v = query.filter_task_type_id
        q['filter[task_type_id][]'] = Array.isArray(v) ? v.map(String).join(',') : String(v)
      }
      const r = await request('GET', v4('/tasks'), { query: q })
      if (!r.success) return r
      const data = r.data as Record<string, unknown> | undefined
      const tasks = data?._embedded as Record<string, unknown> | undefined
      const list = Array.isArray(tasks?.tasks) ? (tasks.tasks as Record<string, unknown>[]) : []
      let pastRange = false
      for (const t of list) {
        const till = typeof t.complete_till === 'number' ? t.complete_till : undefined
        if (till == null) continue
        if (till > toTs!) {
          pastRange = true
          break
        }
        if (till >= fromTs!) collected.push(t)
      }
      if (list.length < limit || pastRange) hasMore = false
      else page += 1
    }
    const out = {
      _embedded: { tasks: collected },
      _page: { total: collected.length, limit: collected.length, page: 1 },
    }
    return { success: true, data: out }
  }

  const q: Record<string, string> = { limit: String(requestedLimit) }
  if (query.page != null) q.page = String(query.page)
  if (query.filter_date_from != null && fromTs != null) q['filter[date_from]'] = String(fromTs)
  if (query.filter_date_to != null && toTs != null) q['filter[date_to]'] = String(toTs)
  if (query.filter_is_completed != null) q['filter[is_completed]'] = String(query.filter_is_completed)
  if (query.filter_task_type_id != null) {
    const v = query.filter_task_type_id
    q['filter[task_type_id][]'] = Array.isArray(v) ? v.map(String).join(',') : String(v)
  }
  return request('GET', v4('/tasks'), { query: q })
}

export async function getTask(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/tasks/${id}`))
}

/** Notes: filter by entity_id and entity_type (lead, contact, company) */
export async function getNotesList(query: {
  limit?: number
  page?: number
  filter_entity_id?: string | number
  filter_entity_type?: string
} = {}): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  if (query.filter_entity_id != null) q['filter[entity_id]'] = String(query.filter_entity_id)
  if (query.filter_entity_type != null) q['filter[entity_type]'] = query.filter_entity_type
  return request('GET', v4('/notes'), { query: q })
}

export async function getNote(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/notes/${id}`))
}

export async function getCatalogsList(query: { limit?: number; page?: number } = {}): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  return request('GET', v4('/catalogs'), { query: q })
}

export async function getCatalog(id: string | number): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  return request('GET', v4(`/catalogs/${id}`))
}

export async function getCatalogElements(
  catalogId: string | number,
  query: { limit?: number; page?: number; query?: string } = {},
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const limit = Math.min(MAX_LIST_LIMIT, query.limit ?? DEFAULT_LIST_LIMIT)
  const q: Record<string, string> = { limit: String(limit) }
  if (query.page != null) q.page = String(query.page)
  if (query.query != null) q.query = query.query
  return request('GET', v4(`/catalogs/${catalogId}/elements`), { query: q })
}
