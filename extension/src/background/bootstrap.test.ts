import { describe, expect, test, vi } from "vitest"

import { runBackgroundBootstrap } from "./bootstrap"

describe("runBackgroundBootstrap", () => {
  test("isolates optional background initialization failures from the message listener bootstrap", () => {
    const warn = vi.fn()
    const initialize = vi.fn(() => { throw new Error("logging setup failed") })

    expect(() => runBackgroundBootstrap(initialize, warn)).not.toThrow()
    expect(warn).toHaveBeenCalledWith("[InspoClip] Optional background initialization failed", expect.any(Error))
  })
})
