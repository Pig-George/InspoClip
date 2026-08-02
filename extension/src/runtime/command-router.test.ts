import { describe, expect, test } from "vitest"

import type { ExtensionRuntime } from "./contracts"
import { createCommandRouter } from "./command-router"

describe("runtime command router", () => {
  test("ignores messages outside the runtime command namespace", async () => {
    const router = createCommandRouter(async () => {
      throw new Error("runtime must not be loaded")
    })

    await expect(router.dispatch({ type: "CAPTURE_TAB" })).resolves.toBeUndefined()
  })

  test("routes a serialized image analysis command", async () => {
    let received: { filename: string; mimeType: string; blob: Blob } | undefined
    const runtime = {
      mode: "backend",
      analysis: {
        analyzeImage: async (input: { filename: string; mimeType: string; blob: Blob }) => {
          received = input
          return {
            id: "job-1",
            assetId: "asset-1",
            assetKind: "image",
            mode: "backend",
            status: "completed",
            result: { terms: ["motion"] },
            createdAt: "2026-08-01T00:00:00.000Z",
            updatedAt: "2026-08-01T00:00:00.000Z"
          }
        }
      }
    } as unknown as ExtensionRuntime
    const router = createCommandRouter(async () => runtime)

    const response = await router.dispatch({
      type: "runtime.analysis.image.start",
      payload: {
        dataUrl: "data:image/png;base64,aW1hZ2U=",
        filename: "ui.png",
        mimeType: "image/png"
      }
    })

    expect(response).toMatchObject({ ok: true, data: { status: "completed" } })
    expect(received?.filename).toBe("ui.png")
    expect(received?.mimeType).toBe("image/png")
    expect(received?.blob).toBeInstanceOf(Blob)
    expect(await received?.blob.text()).toBe("image")
  })

  test("serializes runtime failures", async () => {
    const runtime = {
      mode: "backend",
      assets: {
        save: async () => { throw new Error("Save failed") }
      }
    } as unknown as ExtensionRuntime
    const router = createCommandRouter(async () => runtime)

    await expect(router.dispatch({
      type: "runtime.asset.save",
      payload: { assetId: "asset-1" }
    })).resolves.toEqual({
      ok: false,
      error: { code: "UNKNOWN_ERROR", message: "Save failed", retryable: false }
    })
  })

  test("returns local storage usage through the runtime boundary", async () => {
    const router = createCommandRouter(async () => ({
      mode: "standalone",
      blobs: { usage: async () => ({ usedBytes: 2048, quotaBytes: 4096 }) }
    } as unknown as ExtensionRuntime))

    await expect(router.dispatch({ type: "runtime.storage.usage", payload: {} })).resolves.toEqual({
      ok: true,
      data: { usedBytes: 2048, quotaBytes: 4096 }
    })
  })

  test("reads local asset content as a data URL", async () => {
    const router = createCommandRouter(async () => ({
      mode: "standalone",
      assets: {
        get: async () => ({ id: "asset-1", blob: { store: "standalone", key: "images/asset-1/original.png", mimeType: "image/png", size: 5 } })
      },
      blobs: { get: async () => new Blob(["image"], { type: "image/png" }) }
    } as unknown as ExtensionRuntime))

    await expect(router.dispatch({ type: "runtime.asset.content.read", payload: { assetId: "asset-1" } })).resolves.toMatchObject({
      ok: true,
      data: { dataUrl: "data:image/png;base64,aW1hZ2U=", mimeType: "image/png" }
    })
  })
})
