import { asRecord } from "./presentation"

/**
 * Normalizes image analysis payloads from local and backend adapters.
 * The backend historically calls terminology `terms`, while workspace cards
 * use the client-facing `designTerms` field. Keep both fields for backwards
 * compatibility and lift colors from the server's visualStyle shape.
 */
export function normalizeImageAnalysis(value: unknown): Record<string, unknown> {
  const source = asRecord(value) || {}
  const visualStyle = asRecord(source.visualStyle)
  const terms = firstNonEmptyArray(source.designTerms, source.terms, visualStyle?.designTerms)
  const colors = firstNonEmptyArray(source.colors, visualStyle?.colors)

  return {
    ...source,
    terms,
    designTerms: terms,
    colors
  }
}

function firstNonEmptyArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value
  }
  return values.find(Array.isArray) as unknown[] || []
}
