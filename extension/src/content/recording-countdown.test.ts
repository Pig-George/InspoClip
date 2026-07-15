import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { createRecordingCountdown } from "./recording-countdown"

describe("recording countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("announces each remaining second before completing", async () => {
    const onTick = vi.fn()
    const countdown = createRecordingCountdown(3, { onTick })

    expect(onTick).toHaveBeenCalledTimes(1)
    expect(onTick).toHaveBeenLastCalledWith(3)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(onTick).toHaveBeenLastCalledWith(2)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(onTick).toHaveBeenLastCalledWith(1)

    await vi.advanceTimersByTimeAsync(1_000)
    await expect(countdown.promise).resolves.toBe("completed")
  })

  test("completes a zero-second countdown immediately", async () => {
    const onTick = vi.fn()
    const countdown = createRecordingCountdown(0, { onTick })

    await expect(countdown.promise).resolves.toBe("completed")
    expect(onTick).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  test("cancels without announcing or completing later", async () => {
    const onTick = vi.fn()
    const countdown = createRecordingCountdown(5, { onTick })

    countdown.cancel()
    await expect(countdown.promise).resolves.toBe("cancelled")

    await vi.advanceTimersByTimeAsync(10_000)
    expect(onTick).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("treats repeated cancellation as an idempotent operation", async () => {
    const countdown = createRecordingCountdown(3)

    countdown.cancel()
    countdown.cancel()

    await expect(countdown.promise).resolves.toBe("cancelled")
    expect(vi.getTimerCount()).toBe(0)
  })
})
