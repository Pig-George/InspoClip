export const ANALYSIS_RUNNING_PROGRESS_LIMIT = 92

export function getAnalysisStackScale(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value)
  const stackIndex = Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0
  return Math.max(0.82, Number((1 - stackIndex * 0.035).toFixed(3)))
}

export function normalizeAnalysisProgress(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.min(100, Math.max(0, Math.round(numericValue)))
}

export function getNextAnalysisProgress(currentValue: unknown): number {
  const current = Math.min(ANALYSIS_RUNNING_PROGRESS_LIMIT, normalizeAnalysisProgress(currentValue))
  const remaining = ANALYSIS_RUNNING_PROGRESS_LIMIT - current
  if (remaining <= 0) return ANALYSIS_RUNNING_PROGRESS_LIMIT

  return Math.min(
    ANALYSIS_RUNNING_PROGRESS_LIMIT,
    current + Math.max(1, Math.ceil(remaining * 0.1))
  )
}

export function getAnalysisCompletionSteps(currentValue: unknown): number[] {
  const current = normalizeAnalysisProgress(currentValue)
  if (current >= 100) return []

  const remaining = 100 - current
  return [0.45, 0.75, 1]
    .map((ratio) => Math.round(current + remaining * ratio))
    .filter((value, index, values) => value > current && values.indexOf(value) === index)
}
