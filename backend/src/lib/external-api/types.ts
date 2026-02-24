/**
 * Types for the external API value layer (AmoCRM, Moizvonki).
 */

export type ExternalSource = 'amocrm' | 'moizvonki'

/** Parsed reference from a path string or structured input */
export interface ParsedReference {
  source: ExternalSource
  entity: string
  id?: string
  field?: string
  params?: Record<string, unknown>
}

/** Variable definition in the registry */
export interface VariableDefinition {
  id: string
  description: string
  source: ExternalSource
  entity: string
  requiredParams: string[]
  optionalParams: string[]
  examplePath: string
  resolverKey: string
  /** For dynamic entities, the param name that holds the id (e.g. "leadId") */
  idParam?: string
}

/** Result of resolving a variable */
export interface ResolveResult {
  success: boolean
  value?: unknown
  error?: string
}
