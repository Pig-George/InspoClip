type PreparationResponse = {
  success?: boolean
  error?: string
}

export type AreaRecordingSource = {
  sourceId: string
  promise: Promise<PreparationResponse>
}

export function createAreaRecordingSource(
  preparedSourceId: string | undefined,
  createSourceId: () => string,
  requestPrepare: (sourceId: string) => Promise<PreparationResponse>
): AreaRecordingSource {
  if (preparedSourceId) {
    return {
      sourceId: preparedSourceId,
      promise: Promise.resolve({ success: true })
    }
  }

  const sourceId = createSourceId()
  const promise = requestPrepare(sourceId).then((response) => {
    if (!response?.success) throw new Error(response?.error || "Failed to prepare recording")
    return response
  })

  // Preparation starts eagerly, while the user may remain in screenshot mode.
  // Mark early failures as handled without changing what later awaiters receive.
  void promise.catch(() => undefined)

  return {
    sourceId,
    promise
  }
}
