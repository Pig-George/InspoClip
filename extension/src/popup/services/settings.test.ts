import { beforeEach, describe, expect, test, vi } from "vitest"

import { DEFAULT_MODEL_SETTINGS } from "../constants"
import { loadPopupSettings, savePopupSettings } from "./settings"

describe("popup settings storage", () => {
  const syncSet = vi.fn().mockResolvedValue(undefined)
  const localSet = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: { get: vi.fn().mockResolvedValue({}), set: syncSet },
        local: { get: vi.fn().mockResolvedValue({}), set: localSet }
      }
    })
    syncSet.mockClear()
    localSet.mockClear()
  })

  test("loads default Qwen settings for a new standalone profile", async () => {
    await expect(loadPopupSettings()).resolves.toMatchObject({
      runtimeMode: "standalone",
      modelSettings: DEFAULT_MODEL_SETTINGS,
      serverUrl: "http://127.0.0.1:3001"
    })
  })

  test("normalizes an existing localhost backend setting for Docker", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        sync: { get: vi.fn().mockResolvedValue({ serverUrl: "http://localhost:3001/" }), set: syncSet },
        local: { get: vi.fn().mockResolvedValue({}), set: localSet }
      }
    })

    await expect(loadPopupSettings()).resolves.toMatchObject({
      serverUrl: "http://127.0.0.1:3001"
    })
  })

  test("stores the API key only in local extension storage", async () => {
    await savePopupSettings({
      runtimeMode: "standalone",
      modelSettings: { ...DEFAULT_MODEL_SETTINGS, apiKey: "secret" },
      serverUrl: "http://localhost:3001",
      appUrl: "http://localhost:8080",
      shortcuts: { analyze: "Ctrl+Shift+A", save: "Ctrl+Shift+S" }
    })

    expect(localSet).toHaveBeenCalledWith({ modelSettings: expect.objectContaining({ apiKey: "secret" }) })
    expect(syncSet).toHaveBeenCalledWith(expect.not.objectContaining({ modelSettings: expect.anything(), apiKey: expect.anything() }))
  })
})
