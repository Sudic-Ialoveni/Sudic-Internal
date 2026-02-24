import { parsePath, findVariable } from './registry.js'
import type { ResolveResult } from './types.js'
import * as amocrm from './amocrm.js'
import * as moizvonki from './moizvonki.js'
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './constants.js'

export interface ResolveInput {
  /** Path string, e.g. amocrm.lead(123).potential_amount */
  path?: string
  /** Or structured reference */
  source?: 'amocrm' | 'moizvonki'
  entity?: string
  id?: string
  field?: string
  /** Optional params (e.g. from_date, to_date for calls_list; limit, page, compact for lists) */
  params?: Record<string, unknown>
}

/** Entity key in AmoCRM _embedded (e.g. leads, contacts). For catalog elements the key is 'elements'. */
const EMBEDDED_KEYS: Record<string, string> = {
  'amocrm.leads_list': 'leads',
  'amocrm.contacts_list': 'contacts',
  'amocrm.companies_list': 'companies',
  'amocrm.tasks_list': 'tasks',
  'amocrm.notes_list': 'notes',
  'amocrm.catalogs_list': 'catalogs',
  'amocrm.catalog_elements': 'elements',
}

/** Pick a few key fields per entity for compact view (id + name always; entity-specific extras). */
function slimItem(item: Record<string, unknown>, embeddedKey: string): Record<string, unknown> {
  const id = item.id
  const name = item.name ?? (item.first_name || item.last_name ? [item.first_name, item.last_name].filter(Boolean).join(' ') : undefined)
  const base = { id, name }
  switch (embeddedKey) {
    case 'leads':
      return { ...base, price: item.price, status_id: item.status_id, created_at: item.created_at }
    case 'contacts':
      return { ...base, first_name: item.first_name, last_name: item.last_name, created_at: item.created_at }
    case 'companies':
      return { ...base, created_at: item.created_at }
    case 'tasks':
      return { ...base, task_type_id: item.task_type_id, text: item.text, complete_till: item.complete_till, is_completed: item.is_completed, entity_id: item.entity_id, entity_type: item.entity_type }
    case 'notes':
      return { ...base, note_type: item.note_type, entity_id: item.entity_id, entity_type: item.entity_type, created_at: item.created_at }
    case 'catalogs':
      return { ...base, type: item.type }
    case 'elements':
      return { ...base, catalog_id: item.catalog_id }
    default:
      return { ...base, created_at: item.created_at }
  }
}

/**
 * Shape AmoCRM list response: add _meta (total, page, limit, count, has_more) and optionally compact items.
 * So the AI always sees how many there are and can tell the user to ask for another page or filter.
 */
function shapeAmocrmListResponse(
  data: unknown,
  resolverKey: string,
  options: { compact?: boolean; requestedLimit?: number; requestedPage?: number },
): unknown {
  if (data == null || typeof data !== 'object') return data
  const d = data as Record<string, unknown>
  const embeddedKey = EMBEDDED_KEYS[resolverKey]
  if (!embeddedKey) return data
  const rawItems = (d._embedded as Record<string, unknown>)?.[embeddedKey]
  const items = Array.isArray(rawItems) ? rawItems : []
  const page = (d._page as Record<string, unknown>) ?? {}
  const total = typeof page.total === 'number' ? page.total : items.length
  const limit = typeof page.limit === 'number' ? page.limit : (options.requestedLimit ?? DEFAULT_LIST_LIMIT)
  const pageNum = typeof page.page === 'number' ? page.page : (options.requestedPage ?? 1)
  const hasMore = total > items.length || items.length >= Math.min(limit, MAX_LIST_LIMIT)
  const _meta = {
    total,
    page: pageNum,
    limit,
    count: items.length,
    has_more: hasMore,
    hint: hasMore ? 'Use params { page: 2 } or { limit: 50 } or filter by query to get more.' : undefined,
  }
  const shapedItems = options.compact
    ? items.map((it) => (it != null && typeof it === 'object' ? slimItem(it as Record<string, unknown>, embeddedKey) : it))
    : items
  return { _meta, items: shapedItems }
}

function pickField(obj: unknown, field: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  if (field in o) return o[field]
  const embedded = o._embedded as Record<string, unknown> | undefined
  if (embedded && typeof embedded === 'object' && field in embedded) return embedded[field]
  const first = Array.isArray(o) ? o[0] : null
  if (first != null && typeof first === 'object' && field in (first as Record<string, unknown>)) {
    return (first as Record<string, unknown>)[field]
  }
  return undefined
}

export async function resolve(input: ResolveInput): Promise<ResolveResult> {
  let parsed: { source: string; entity: string; id?: string; field?: string }
  if (input.path) {
    const p = parsePath(input.path)
    if (!p) {
      return { success: false, error: `Invalid path: "${input.path}". Use format: source.entity or source.entity(id).field` }
    }
    parsed = p
  } else if (input.source && input.entity) {
    parsed = {
      source: input.source,
      entity: input.entity,
      id: input.id,
      field: input.field,
    }
  } else {
    return { success: false, error: 'Provide either path or (source + entity)' }
  }

  const params = input.params ?? {}
  const def = findVariable(parsed)
  if (!def) {
    return { success: false, error: `Unknown variable: ${parsed.source}.${parsed.entity}${parsed.id ? `(${parsed.id})` : ''}. Check the variable registry.` }
  }

  const source = def.source
  const key = def.resolverKey

  try {
    if (source === 'amocrm') {
      if (key === 'amocrm.account') {
        const r = await amocrm.getAccount()
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'amocrm.pipelines') {
        const r = await amocrm.getPipelines()
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'amocrm.leads_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getLeadsList({
          limit,
          page,
          query: typeof params.query === 'string' ? params.query : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.contacts_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getContactsList({
          limit,
          page,
          query: typeof params.query === 'string' ? params.query : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.companies_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getCompaniesList({
          limit,
          page,
          query: typeof params.query === 'string' ? params.query : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.users') {
        const r = await amocrm.getUsers()
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'amocrm.tasks_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const filterDateFrom = params.filter_date_from != null ? params.filter_date_from : undefined
        const filterDateTo = params.filter_date_to != null ? params.filter_date_to : undefined
        const filterIsCompleted = params.filter_is_completed != null ? (Number(params.filter_is_completed) as 0 | 1) : undefined
        const filterTaskTypeId = params.filter_task_type_id
        const r = await amocrm.getTasksList({
          limit,
          page,
          filter_date_from: filterDateFrom !== undefined ? (typeof filterDateFrom === 'number' ? filterDateFrom : String(filterDateFrom)) : undefined,
          filter_date_to: filterDateTo !== undefined ? (typeof filterDateTo === 'number' ? filterDateTo : String(filterDateTo)) : undefined,
          filter_is_completed: filterIsCompleted,
          filter_task_type_id:
            filterTaskTypeId === undefined
              ? undefined
              : Array.isArray(filterTaskTypeId)
                ? (filterTaskTypeId as number[])
                : Number(filterTaskTypeId),
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.lead') {
        const leadId = parsed.id ?? (params.leadId != null ? String(params.leadId) : null)
        if (!leadId) return { success: false, error: 'Missing required param: leadId (or use path amocrm.lead(123))' }
        const r = await amocrm.getLead(leadId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.leads
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.contact') {
        const contactId = parsed.id ?? (params.contactId != null ? String(params.contactId) : null)
        if (!contactId) return { success: false, error: 'Missing required param: contactId (or use path amocrm.contact(456))' }
        const r = await amocrm.getContact(contactId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.contacts
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.company') {
        const companyId = parsed.id ?? (params.companyId != null ? String(params.companyId) : null)
        if (!companyId) return { success: false, error: 'Missing required param: companyId (or use path amocrm.company(789))' }
        const r = await amocrm.getCompany(companyId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.companies
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.task') {
        const taskId = parsed.id ?? (params.taskId != null ? String(params.taskId) : null)
        if (!taskId) return { success: false, error: 'Missing required param: taskId (or use path amocrm.task(123))' }
        const r = await amocrm.getTask(taskId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.tasks
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.notes_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getNotesList({
          limit,
          page,
          filter_entity_id: params.filter_entity_id != null ? (typeof params.filter_entity_id === 'number' ? params.filter_entity_id : String(params.filter_entity_id)) : undefined,
          filter_entity_type: typeof params.filter_entity_type === 'string' ? params.filter_entity_type : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.note') {
        const noteId = parsed.id ?? (params.noteId != null ? String(params.noteId) : null)
        if (!noteId) return { success: false, error: 'Missing required param: noteId (or use path amocrm.note(123))' }
        const r = await amocrm.getNote(noteId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.notes
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.catalogs_list') {
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getCatalogsList({
          limit,
          page,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
      if (key === 'amocrm.catalog') {
        const catalogId = parsed.id ?? (params.catalogId != null ? String(params.catalogId) : null)
        if (!catalogId) return { success: false, error: 'Missing required param: catalogId (or use path amocrm.catalog(123))' }
        const r = await amocrm.getCatalog(catalogId)
        if (!r.success) return { success: false, error: r.error }
        let value = (r.data as Record<string, unknown>)?._embedded?.catalogs
        if (Array.isArray(value) && value.length > 0) value = value[0]
        else value = r.data
        if (parsed.field) value = pickField(value, parsed.field)
        return { success: true, value }
      }
      if (key === 'amocrm.catalog_elements') {
        const catalogId = parsed.id ?? (params.catalogId != null ? String(params.catalogId) : null)
        if (!catalogId) return { success: false, error: 'Missing required param: catalogId (or use path amocrm.catalog_elements(123))' }
        const limit = typeof params.limit === 'number' ? params.limit : undefined
        const page = typeof params.page === 'number' ? params.page : undefined
        const r = await amocrm.getCatalogElements(catalogId, {
          limit,
          page,
          query: typeof params.query === 'string' ? params.query : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        const value = shapeAmocrmListResponse(r.data, key, { compact: params.compact === true, requestedLimit: limit, requestedPage: page })
        return { success: true, value }
      }
    }

    if (source === 'moizvonki') {
      if (key === 'moizvonki.calls_list') {
        const fromDate = params.from_date != null ? Number(params.from_date) : undefined
        const toDate = params.to_date != null ? Number(params.to_date) : undefined
        const fromId = params.from_id != null ? Number(params.from_id) : undefined
        const maxResults = params.max_results != null ? Math.min(100, Number(params.max_results)) : DEFAULT_LIST_LIMIT
        const fromOffset = params.from_offset != null ? Number(params.from_offset) : undefined
        const supervised = params.supervised != null ? (Number(params.supervised) as 0 | 1) : undefined
        const r = await moizvonki.callsList({
          from_id: fromId ?? 0,
          from_date: fromDate,
          to_date: toDate,
          max_results: maxResults,
          from_offset: fromOffset,
          supervised,
        })
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'moizvonki.sms_templates') {
        const r = await moizvonki.getSmsTemplates()
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'moizvonki.employees') {
        const r = await moizvonki.listEmployee({
          max_results: params.max_results != null ? Number(params.max_results) : undefined,
          from_offset: params.from_offset != null ? Number(params.from_offset) : undefined,
          employee_user_name: typeof params.employee_user_name === 'string' ? params.employee_user_name : undefined,
          employee_id: params.employee_id != null ? Number(params.employee_id) : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'moizvonki.groups') {
        const r = await moizvonki.listGroup({
          max_results: params.max_results != null ? Number(params.max_results) : undefined,
          from_offset: params.from_offset != null ? Number(params.from_offset) : undefined,
        })
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
      if (key === 'moizvonki.webhook_list') {
        const r = await moizvonki.webhookList()
        if (!r.success) return { success: false, error: r.error }
        return { success: true, value: r.data }
      }
    }

    return { success: false, error: `Resolver not implemented for: ${key}` }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Resolve failed: ${message}` }
  }
}
