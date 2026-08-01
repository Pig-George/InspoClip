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

  test("does not silently fall back when standalone mode is not enabled", async () => {
    const factory = new RuntimeFactory({ fetchFn: async () => new Response() })

    await expect(factory.get({ mode: "standalone", serverUrl: "http://localhost:3001" }))
      .rejects.toThrowError("Standalone mode is not enabled in this build")
  })
})
