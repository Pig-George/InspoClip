export type RecordingCountdownResult = "completed" | "cancelled"

export type RecordingCountdown = {
  promise: Promise<RecordingCountdownResult>
  cancel: () => void
}

export function createRecordingCountdown(
  seconds: number,
  options: { onTick?: (remainingSeconds: number) => void } = {}
): RecordingCountdown {
  const duration = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  let remaining = duration
  let timerId: ReturnType<typeof setTimeout> | undefined
  let settled = false
  let resolveResult: (result: RecordingCountdownResult) => void = () => undefined

  const promise = new Promise<RecordingCountdownResult>((resolve) => {
    resolveResult = resolve
  })

  const settle = (result: RecordingCountdownResult) => {
    if (settled) return
    settled = true
    if (timerId !== undefined) {
      clearTimeout(timerId)
      timerId = undefined
    }
    resolveResult(result)
  }

  const scheduleNextTick = () => {
    if (remaining <= 0) {
      settle("completed")
      return
    }

    options.onTick?.(remaining)
    timerId = setTimeout(() => {
      timerId = undefined
      remaining -= 1
      scheduleNextTick()
    }, 1_000)
  }

  scheduleNextTick()

  return {
    promise,
    cancel: () => settle("cancelled")
  }
}
