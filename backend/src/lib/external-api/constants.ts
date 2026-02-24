/**
 * Default and max limits for list endpoints to avoid huge responses.
 * AI can override with params.limit (capped at MAX_LIST_LIMIT) or use page for more.
 */
export const DEFAULT_LIST_LIMIT = 25
export const MAX_LIST_LIMIT = 250
