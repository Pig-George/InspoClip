import { describe, expect, test, vi } from "vitest"

import {
  EXTENSION_LOGS_KEY,
  LEGACY_BACKEND_DIAGNOSTICS_KEY,
  createExtensionLogRecorder,
  installExtensionErrorLogging,
  loadExtensionLogs,
  type ExtensionLogStorage
} from "./extension-logger"

function storage(initial: Record<string, unknown> = {}): ExtensionLogStorage {
  const values = { ...initial }
  return {
    get: async (key) => ({ [key]: values[key] }),
    set: async (next) => { Object.assign(values, next) },
    remove: async (key) => { delete values[key] }
  }
}

describe("development extension logger", () => {
  test("persists a sanitized structured error", async () => {
    const localStorage = storage()
    const record = createExtensionLogRecorder(localStorage, true, () => "2026-08-02T10:00:00.000Z")

    await record({
      source: "backend",
      level: "error",
      error: new Error("request failed for https://example.com/analyze?token=secret"),
      context: {
        method: "POST",
        url: "http://user:secret@127.0.0.1:3001/api/images/analyze?apiKey=secret",
        authorization: "Bearer secret"
      }
    })

    const [entry] = await loadExtensionLogs(localStorage, true)
    expect(entry).toMatchObject({
      timestamp: "2026-08-02T10:00:00.000Z",
      source: "backend",
      level: "error",
      message: "request failed for https://example.com/analyze",
      context: {
        method: "POST",
        url: "http://127.0.0.1:3001/api/images/analyze",
        authorization: "[redacted]"
      }
    })
    expect(entry.stack).toContain("Error: request failed")
  })

  test("migrates legacy backend diagnostics into the unified log", async () => {
    const localStorage = storage({
      [LEGACY_BACKEND_DIAGNOSTICS_KEY]: [{
        timestamp: "2026-08-02T09:00:00.000Z",
        url: "http://127.0.0.1:3001/api/videos",
        method: "POST",
        error: "fetch failed"
      }]
    })

    await expect(loadExtensionLogs(localStorage, true)).resolves.toEqual([{
      timestamp: "2026-08-02T09:00:00.000Z",
      source: "backend",
      level: "error",
      message: "fetch failed",
      context: {
        method: "POST",
        url: "http://127.0.0.1:3001/api/videos"
      }
    }])
  })

  test("keeps only the most recent 100 logs", async () => {
    const localStorage = storage({
      [EXTENSION_LOGS_KEY]: Array.from({ length: 100 }, (_, index) => ({
        timestamp: `2026-08-02T10:00:${String(index % 60).padStart(2, "0")}.000Z`,
        source: "content",
        level: "warn",
        message: `warning ${index}`
      }))
    })
    const record = createExtensionLogRecorder(localStorage, true, () => "2026-08-02T10:02:00.000Z")

    await record({ source: "popup", level: "error", error: "latest" })

    const logs = await loadExtensionLogs(localStorage, true)
    expect(logs).toHaveLength(100)
    expect(logs[0].message).toBe("latest")
    expect(logs.at(-1)?.message).toBe("warning 98")
  })

  test("captures console errors and unhandled rejections from an extension context", async () => {
    const localStorage = storage()
    const target = new EventTarget()
    const consoleTarget = { error: vi.fn(), warn: vi.fn() }
    const originalConsoleError = consoleTarget.error
    const installation = installExtensionErrorLogging({
      source: "popup",
      enabled: true,
      storage: localStorage,
      target,
      consoleTarget
    })

    consoleTarget.error("popup failed", new Error("boom"))
    target.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new Error("async boom") }))
    await installation.flush()

    const logs = await loadExtensionLogs(localStorage, true)
    expect(logs.map((entry) => entry.message)).toEqual([
      "async boom",
      "popup failed boom"
    ])
    expect(originalConsoleError).toHaveBeenCalledOnce()
    installation.uninstall()
  })

  test("can retain the native console for Service Worker startup safety", async () => {
    const localStorage = storage()
    const target = new EventTarget()
    const consoleTarget = { error: vi.fn(), warn: vi.fn() }
    const originalError = consoleTarget.error
    const originalWarn = consoleTarget.warn

    const installation = installExtensionErrorLogging({
      source: "background",
      enabled: true,
      storage: localStorage,
      target,
      consoleTarget,
      captureConsole: false
    })

    expect(consoleTarget.error).toBe(originalError)
    expect(consoleTarget.warn).toBe(originalWarn)
    target.dispatchEvent(Object.assign(new Event("error"), { error: new Error("background boom") }))
    await installation.flush()

    await expect(loadExtensionLogs(localStorage, true)).resolves.toEqual([
      expect.objectContaining({ source: "background", message: "background boom" })
    ])
    installation.uninstall()
  })

  test("does not collect logs outside development builds", async () => {
    const localStorage = storage()
    const record = createExtensionLogRecorder(localStorage, false)

    await record({ source: "background", level: "error", error: new Error("offline") })

    await expect(loadExtensionLogs(localStorage, false)).resolves.toEqual([])
  })
})
