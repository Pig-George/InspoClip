import { describe, expect, test, vi } from "vitest"

import { createAreaRecordingSource } from "./area-recording-source"

describe("area recording source", () => {
  test("reuses a source prepared by the background without requesting permission again", async () => {
    const requestPrepare = vi.fn()

    const source = createAreaRecordingSource("prepared-source", () => "new-source", requestPrepare)

    await expect(source.promise).resolves.toEqual({ success: true })
    expect(source.sourceId).toBe("prepared-source")
    expect(requestPrepare).not.toHaveBeenCalled()
  })

  test("requests preparation when capture was not started by the background", async () => {
    const requestPrepare = vi.fn().mockResolvedValue({ success: true })

    const source = createAreaRecordingSource(undefined, () => "new-source", requestPrepare)

    await expect(source.promise).resolves.toEqual({ success: true })
    expect(source.sourceId).toBe("new-source")
    expect(requestPrepare).toHaveBeenCalledWith("new-source")
  })
})
