import { describe, expect, test } from "vitest"

import { blobToDataUrl, sendRuntimeCommand } from "./command-client"

describe("runtime command client", () => {
  test("returns command data without adding backend settings", async () => {
    const messages: unknown[] = []
    const data = await sendRuntimeCommand(
      {
        type: "runtime.analysis.job.get",
        payload: { jobId: "job-1" }
      },
      async (message) => {
        messages.push(message)
        return { ok: true, data: { id: "job-1", status: "processing" } }
      }
    )

    expect(data).toEqual({ id: "job-1", status: "processing" })
    expect(messages[0]).not.toHaveProperty("serverUrl")
  })

  test("restores a structured runtime failure from the message response", async () => {
    await expect(sendRuntimeCommand(
      { type: "runtime.asset.save", payload: { assetId: "asset-1" } },
      async () => ({
        ok: false,
        error: { code: "NETWORK_ERROR", message: "offline", retryable: true, action: "retry" }
      })
    )).rejects.toMatchObject({
      detail: { code: "NETWORK_ERROR", message: "offline", retryable: true, action: "retry" }
    })
  })

  test("serializes a blob for Chrome runtime messaging", async () => {
    await expect(blobToDataUrl(new Blob(["image"], { type: "image/png" })))
      .resolves.toBe("data:image/png;base64,aW1hZ2U=")
  })
})
