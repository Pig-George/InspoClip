import { describe, expect, test } from "vitest"

import { RuntimeFactory } from "./runtime-factory"

describe("RuntimeFactory", () => {
  test("reuses the backend runtime for the same settings snapshot", async () => {
    const factory = new RuntimeFactory({ fetchFn: async () => new Response() })

    const first = await factory.get({ mode: "backend", serverUrl: "http://localhost:3001/" })
    const second = await factory.get({ mode: "backend", serverUrl: "http://localhost:3001" })

    expect(first).toBe(second)
    expect(first.mode).toBe("backend")
  })

  test("recreates the runtime when the backend address changes", async () => {
    const factory = new RuntimeFactory({ fetchFn: async () => new Response() })

    const first = await factory.get({ mode: "backend", serverUrl: "http://localhost:3001" })
    const second = await factory.get({ mode: "backend", serverUrl: "http://127.0.0.1:3001" })

    expect(first).not.toBe(second)
  })

  test("creates and isolates a standalone runtime without falling back", async () => {
    let standaloneCreates = 0
    const standaloneRuntime = { mode: "standalone" as const } as never
    const factory = new RuntimeFactory({
      fetchFn: async () => new Response(),
      createStandaloneRuntime: async () => {
        standaloneCreates += 1
        return standaloneRuntime
      }
    })

    const backend = await factory.get({ mode: "backend", serverUrl: "http://localhost:3001" })
    const standalone = await factory.get({ mode: "standalone", serverUrl: "http://localhost:3001" })
    const standaloneAgain = await factory.get({ mode: "standalone", serverUrl: "http://different:3001" })

    expect(standalone).toBe(standaloneRuntime)
    expect(standaloneAgain).toBe(standaloneRuntime)
    expect(standalone).not.toBe(backend)
    expect(standaloneCreates).toBe(1)
  })
})
