import { afterEach, describe, expect, test, vi } from "vitest"

import { CONTENT_RUNTIME_MARKER } from "../content/bootstrap"
import { sendContentMessage } from "./messages"

describe("sendContentMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("clears a stale content runtime marker before reinjecting after a missing receiver", async () => {
    const sendMessage = vi.fn()
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValueOnce({ ok: true })
    const executeScript = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => ({ content_scripts: [{ js: ["inspoclip.hash.js"] }] })
      },
      tabs: {
        get: vi.fn().mockResolvedValue({ id: 42, url: "https://example.com" }),
        sendMessage
      },
      scripting: { executeScript }
    })

    await expect(sendContentMessage(42, { type: "START_AREA_CAPTURE" })).resolves.toEqual({ ok: true })

    expect(executeScript).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: 42 },
      args: [CONTENT_RUNTIME_MARKER],
      func: expect.any(Function)
    }))
    expect(executeScript).toHaveBeenNthCalledWith(2, {
      target: { tabId: 42 },
      files: ["inspoclip.hash.js"]
    })
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })
})
