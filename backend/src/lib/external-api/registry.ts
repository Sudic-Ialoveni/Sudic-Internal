import type { VariableDefinition } from './types.js'

/**
 * Path parser: converts path strings like
 * - amocrm.pipelines
 * - amocrm.lead(123)
 * - amocrm.lead(123).potential_amount
 * - moizvonki.calls_list
 * into ParsedReference (structured form).
 */
export function parsePath(path: string): { source: string; entity: string; id?: string; field?: string } | null {
  const trimmed = path.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(amocrm|moizvonki)\.([a-z0-9_]+)(?:\(([^)]+)\))?(?:\.([a-z0-9_]+))?$/i)
  if (!match) return null

  const [, source, entity, id, field] = match
  return {
    source: source!.toLowerCase(),
    entity: entity!,
    id: id?.trim() || undefined,
    field: field || undefined,
  }
}

/**
 * Variable registry: single source of truth for all values the AI can request.
 * Used by the resolver and by the debug page (GET /api/external-api/variables).
 */
export const VARIABLE_REGISTRY: VariableDefinition[] = [
  // ---- AmoCRM static ----
  {
    id: 'amocrm.account',
    description: 'Current AmoCRM account info (name, timezone, currency)',
    source: 'amocrm',
    entity: 'account',
    requiredParams: [],
    optionalParams: [],
    examplePath: 'amocrm.account',
    resolverKey: 'amocrm.account',
  },
  {
    id: 'amocrm.pipelines',
    description: 'Sales pipelines and stages',
    source: 'amocrm',
    entity: 'pipelines',
    requiredParams: [],
    optionalParams: [],
    examplePath: 'amocrm.pipelines',
    resolverKey: 'amocrm.pipelines',
  },
  {
    id: 'amocrm.leads_list',
    description: 'List of leads (deals) with optional filters',
    source: 'amocrm',
    entity: 'leads',
    requiredParams: [],
    optionalParams: ['limit', 'page', 'query', 'compact'],
    examplePath: 'amocrm.leads_list',
    resolverKey: 'amocrm.leads_list',
  },
  {
    id: 'amocrm.contacts_list',
    description: 'List of contacts with optional filters',
    source: 'amocrm',
    entity: 'contacts',
    requiredParams: [],
    optionalParams: ['limit', 'page', 'query', 'compact'],
    examplePath: 'amocrm.contacts_list',
    resolverKey: 'amocrm.contacts_list',
  },
  {
    id: 'amocrm.companies_list',
    description: 'List of companies with optional filters',
    source: 'amocrm',
    entity: 'companies',
    requiredParams: [],
    optionalParams: ['limit', 'page', 'query', 'compact'],
    examplePath: 'amocrm.companies_list',
    resolverKey: 'amocrm.companies_list',
  },
  {
    id: 'amocrm.users',
    description: 'AmoCRM users (account members)',
    source: 'amocrm',
    entity: 'users',
    requiredParams: [],
    optionalParams: [],
    examplePath: 'amocrm.users',
    resolverKey: 'amocrm.users',
  },
  {
    id: 'amocrm.tasks_list',
    description: 'List of tasks; optional filter date_from, date_to (Unix timestamp or YYYY-MM-DD), is_completed, task_type_id',
    source: 'amocrm',
    entity: 'tasks_list',
    requiredParams: [],
    optionalParams: ['filter_date_from', 'filter_date_to', 'filter_is_completed', 'filter_task_type_id', 'limit', 'page', 'compact'],
    examplePath: 'amocrm.tasks_list',
    resolverKey: 'amocrm.tasks_list',
  },
  {
    id: 'amocrm.tasks',
    description: 'List of tasks (alias for tasks_list); optional filter date_from, date_to for today\'s tasks',
    source: 'amocrm',
    entity: 'tasks',
    requiredParams: [],
    optionalParams: ['filter_date_from', 'filter_date_to', 'filter_is_completed', 'filter_task_type_id', 'limit', 'page', 'compact'],
    examplePath: 'amocrm.tasks',
    resolverKey: 'amocrm.tasks_list',
  },
  {
    id: 'amocrm.notes_list',
    description: 'List of notes; optional filter entity_id, entity_type (lead/contact/company), limit, page',
    source: 'amocrm',
    entity: 'notes_list',
    requiredParams: [],
    optionalParams: ['filter_entity_id', 'filter_entity_type', 'limit', 'page', 'compact'],
    examplePath: 'amocrm.notes_list',
    resolverKey: 'amocrm.notes_list',
  },
  {
    id: 'amocrm.notes',
    description: 'List of notes (alias for notes_list)',
    source: 'amocrm',
    entity: 'notes',
    requiredParams: [],
    optionalParams: ['filter_entity_id', 'filter_entity_type', 'limit', 'page', 'compact'],
    examplePath: 'amocrm.notes',
    resolverKey: 'amocrm.notes_list',
  },
  {
    id: 'amocrm.catalogs_list',
    description: 'List of catalogs (product/service catalogs)',
    source: 'amocrm',
    entity: 'catalogs_list',
    requiredParams: [],
    optionalParams: ['limit', 'page', 'compact'],
    examplePath: 'amocrm.catalogs_list',
    resolverKey: 'amocrm.catalogs_list',
  },
  {
    id: 'amocrm.catalogs',
    description: 'List of catalogs (alias for catalogs_list)',
    source: 'amocrm',
    entity: 'catalogs',
    requiredParams: [],
    optionalParams: ['limit', 'page', 'compact'],
    examplePath: 'amocrm.catalogs',
    resolverKey: 'amocrm.catalogs_list',
  },
  // ---- AmoCRM dynamic ----
  {
    id: 'amocrm.lead',
    description: 'Single lead (deal) by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'lead',
    requiredParams: ['leadId'],
    optionalParams: [],
    examplePath: 'amocrm.lead(123) or amocrm.lead(123).potential_amount',
    resolverKey: 'amocrm.lead',
    idParam: 'leadId',
  },
  {
    id: 'amocrm.contact',
    description: 'Single contact by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'contact',
    requiredParams: ['contactId'],
    optionalParams: [],
    examplePath: 'amocrm.contact(456) or amocrm.contact(456).name',
    resolverKey: 'amocrm.contact',
    idParam: 'contactId',
  },
  {
    id: 'amocrm.company',
    description: 'Single company by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'company',
    requiredParams: ['companyId'],
    optionalParams: [],
    examplePath: 'amocrm.company(789) or amocrm.company(789).name',
    resolverKey: 'amocrm.company',
    idParam: 'companyId',
  },
  {
    id: 'amocrm.task',
    description: 'Single task by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'task',
    requiredParams: ['taskId'],
    optionalParams: [],
    examplePath: 'amocrm.task(123) or amocrm.task(123).task_type_id',
    resolverKey: 'amocrm.task',
    idParam: 'taskId',
  },
  {
    id: 'amocrm.note',
    description: 'Single note by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'note',
    requiredParams: ['noteId'],
    optionalParams: [],
    examplePath: 'amocrm.note(123)',
    resolverKey: 'amocrm.note',
    idParam: 'noteId',
  },
  {
    id: 'amocrm.catalog',
    description: 'Single catalog by ID; optionally request a specific field',
    source: 'amocrm',
    entity: 'catalog',
    requiredParams: ['catalogId'],
    optionalParams: [],
    examplePath: 'amocrm.catalog(123)',
    resolverKey: 'amocrm.catalog',
    idParam: 'catalogId',
  },
  {
    id: 'amocrm.catalog_elements',
    description: 'Elements (products/items) of a catalog by catalog ID',
    source: 'amocrm',
    entity: 'catalog_elements',
    requiredParams: ['catalogId'],
    optionalParams: ['limit', 'page', 'query', 'compact'],
    examplePath: 'amocrm.catalog_elements(123)',
    resolverKey: 'amocrm.catalog_elements',
    idParam: 'catalogId',
  },
  // ---- Moizvonki static ----
  {
    id: 'moizvonki.calls_list',
    description: 'List of calls from Moizvonki; optional from_date, to_date, max_results, supervised',
    source: 'moizvonki',
    entity: 'calls',
    requiredParams: [],
    optionalParams: ['from_date', 'to_date', 'from_id', 'max_results', 'from_offset', 'supervised'],
    examplePath: 'moizvonki.calls_list',
    resolverKey: 'moizvonki.calls_list',
  },
  {
    id: 'moizvonki.sms_templates',
    description: 'SMS templates configured in Moizvonki',
    source: 'moizvonki',
    entity: 'sms_templates',
    requiredParams: [],
    optionalParams: [],
    examplePath: 'moizvonki.sms_templates',
    resolverKey: 'moizvonki.sms_templates',
  },
  {
    id: 'moizvonki.employees',
    description: 'List of employees (users) in Moizvonki account',
    source: 'moizvonki',
    entity: 'employees',
    requiredParams: [],
    optionalParams: ['max_results', 'from_offset', 'employee_user_name', 'employee_id'],
    examplePath: 'moizvonki.employees',
    resolverKey: 'moizvonki.employees',
  },
  {
    id: 'moizvonki.groups',
    description: 'List of groups in Moizvonki account',
    source: 'moizvonki',
    entity: 'groups',
    requiredParams: [],
    optionalParams: ['max_results', 'from_offset'],
    examplePath: 'moizvonki.groups',
    resolverKey: 'moizvonki.groups',
  },
  {
    id: 'moizvonki.webhook_list',
    description: 'Current webhook subscriptions (call.start, call.answer, call.finish, sms.message)',
    source: 'moizvonki',
    entity: 'webhook_list',
    requiredParams: [],
    optionalParams: [],
    examplePath: 'moizvonki.webhook_list',
    resolverKey: 'moizvonki.webhook_list',
  },
]

/** Get all variables for debug/listing (grouped by source) */
export function getAllVariables(): VariableDefinition[] {
  return [...VARIABLE_REGISTRY]
}

/** Find a variable definition that matches the parsed reference */
export function findVariable(
  parsed: { source: string; entity: string; id?: string; field?: string },
): VariableDefinition | null {
  const source = parsed.source as 'amocrm' | 'moizvonki'
  const entity = parsed.entity

  // Dynamic: amocrm.lead(123).field -> entity "lead", id "123"
  const isDynamic = parsed.id != null && parsed.id !== ''

  if (isDynamic) {
    const def = VARIABLE_REGISTRY.find(
      (v) => v.source === source && v.entity === entity && v.idParam != null,
    )
    return def ?? null
  }

  // Static: exact match on source + entity
  const def = VARIABLE_REGISTRY.find(
    (v) => v.source === source && v.entity === entity && v.idParam == null,
  )
  return def ?? null
}
