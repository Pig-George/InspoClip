import { describe, expect, test } from "vitest"

import {
  BACKEND_DIAGNOSTICS_KEY,
  createBackendDiagnosticRecorder,
  loadBackendDiagnostics,
  type DiagnosticStorage
} from "./development-diagnostics"

function storage(initial: Record<string, unknown> = {}): DiagnosticStorage {
  const values = { ...initial }
  return {
    get: async (key) => ({ [key]: values[key] }),
    set: async (next) => { Object.assign(values, next) },
    remove: async (key) => { delete values[key] }
  }
}

describe("development backend diagnostics", () => {
  test("persists a sanitized failed request when development diagnostics are enabled", async () => {
    const localStorage = storage()
    const record = createBackendDiagnosticRecorder(localStorage, true, () => "2026-08-02T10:00:00.000Z")

    await record({
      url: "http://user:secret@127.0.0.1:3001/api/images/analyze?token=secret",
      method: "POST",
      error: new TypeError("fetch failed")
    })

    await expect(loadBackendDiagnostics(localStorage, true)).resolves.toEqual([
      {
        timestamp: "2026-08-02T10:00:00.000Z",
        url: "http://127.0.0.1:3001/api/images/analyze",
        method: "POST",
        error: "fetch failed"
      }
    ])
  })

  test("keeps only the most recent 20 diagnostics", async () => {
    const localStorage = storage({
      [BACKEND_DIAGNOSTICS_KEY]: Array.from({ length: 20 }, (_, index) => ({
        timestamp: `2026-08-02T10:00:${String(index).padStart(2, "0")}.000Z`,
        url: `http://127.0.0.1:3001/api/${index}`,
        method: "GET",
        error: "fetch failed"
      }))
    })
    const record = createBackendDiagnosticRecorder(localStorage, true, () => "2026-08-02T10:01:00.000Z")

    await record({ url: "http://127.0.0.1:3001/api/latest", method: "POST", error: new Error("offline") })

    const diagnostics = await loadBackendDiagnostics(localStorage, true)
    expect(diagnostics).toHaveLength(20)
    expect(diagnostics[0].url).toBe("http://127.0.0.1:3001/api/latest")
    expect(diagnostics.at(-1)?.url).toBe("http://127.0.0.1:3001/api/18")
  })

  test("does not write or expose diagnostics outside development builds", async () => {
    const localStorage = storage()
    const record = createBackendDiagnosticRecorder(localStorage, false)

    await record({ url: "http://127.0.0.1:3001/api/images/analyze", method: "POST", error: new Error("offline") })

    await expect(loadBackendDiagnostics(localStorage, false)).resolves.toEqual([])
  })
})
