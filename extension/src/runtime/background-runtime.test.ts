import { describe, expect, test } from "vitest"

import { createBackgroundRuntimeProvider } from "./background-runtime"

describe("background runtime provider", () => {
  test("loads a fresh mode snapshot for each command", async () => {
    let mode: "backend" | "standalone" = "backend"
    const settings: Array<{ mode: string; serverUrl: string }> = []
    const provider = createBackgroundRuntimeProvider({
      loadMode: async () => mode,
      loadServerUrl: async () => "http://localhost:3001",
      factory: {
        async get(value) {
          settings.push(value)
          return { mode: value.mode } as never
        }
      }
    })

    await expect(provider()).resolves.toMatchObject({ mode: "backend" })
    mode = "standalone"
    await expect(provider()).resolves.toMatchObject({ mode: "standalone" })
    expect(settings).toEqual([
      { mode: "backend", serverUrl: "http://localhost:3001" },
      { mode: "standalone", serverUrl: "http://localhost:3001" }
    ])
  })
})
