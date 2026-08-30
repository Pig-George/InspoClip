import { describe, expect, test } from "vitest"

import { initializeRuntimeMode, loadRuntimeMode, saveRuntimeMode, type StorageAreaLike } from "./settings"

function createStorage(initial: Record<string, unknown> = {}): StorageAreaLike & { data: Record<string, unknown> } {
  const data = { ...initial }
  return {
    data,
    async get(keys) {
      const names = Array.isArray(keys) ? keys : [keys]
      return Object.fromEntries(names.filter((key) => key in data).map((key) => [key, data[key]]))
    },
    async set(values) {
      Object.assign(data, values)
    }
  }
}

describe("runtime mode settings", () => {
  test("defaults installations without a stored choice to standalone mode", async () => {
    const local = createStorage()

    await expect(loadRuntimeMode(local)).resolves.toBe("standalone")
  })

  test("initializes a new installation in standalone mode", async () => {
    const local = createStorage()

    await expect(initializeRuntimeMode("install", local)).resolves.toBe("standalone")
    expect(local.data).toEqual({ runtimeMode: "standalone" })
  })

  test("initializes an upgraded installation in standalone mode when no choice was stored", async () => {
    const local = createStorage()

    await expect(initializeRuntimeMode("update", local)).resolves.toBe("standalone")
    expect(local.data).toEqual({ runtimeMode: "standalone" })
  })

  test("preserves an explicit choice during extension updates", async () => {
    const local = createStorage({ runtimeMode: "standalone" })

    await expect(initializeRuntimeMode("update", local)).resolves.toBe("standalone")
    expect(local.data).toEqual({ runtimeMode: "standalone" })
  })

  test("persists mode only in the provided local storage area", async () => {
    const local = createStorage()

    await saveRuntimeMode("standalone", local)

    expect(local.data.runtimeMode).toBe("standalone")
    expect(Object.keys(local.data)).toEqual(["runtimeMode"])
  })

  test("ignores invalid stored values", async () => {
    const local = createStorage({ runtimeMode: "automatic" })

    await expect(loadRuntimeMode(local)).resolves.toBe("standalone")
  })
})
