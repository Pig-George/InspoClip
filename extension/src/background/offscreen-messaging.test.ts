import { describe, expect, test, vi } from "vitest"

import { sendOffscreenMessageWithRetry } from "./offscreen-messaging"

describe("sendOffscreenMessageWithRetry", () => {
  test("retries while a newly created Offscreen document has not registered its receiver", async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValueOnce({ success: true })
    const wait = vi.fn().mockResolvedValue(undefined)

    await expect(sendOffscreenMessageWithRetry({ type: "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE" }, { send, wait })).resolves.toEqual({ success: true })

    expect(send).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledWith(60)
  })

  test("does not retry a real Offscreen command failure", async () => {
    const send = vi.fn().mockRejectedValue(new Error("Prepared recording source expired"))
    const wait = vi.fn().mockResolvedValue(undefined)

    await expect(sendOffscreenMessageWithRetry({ type: "START_OFFSCREEN_AREA_RECORDING" }, { send, wait })).rejects.toThrow("Prepared recording source expired")

    expect(send).toHaveBeenCalledOnce()
    expect(wait).not.toHaveBeenCalled()
  })
})
