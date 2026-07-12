import { describe, expect, test } from "vitest"

import { CONTENT_RUNTIME_MARKER, claimContentRuntime, removeExistingContentRoot } from "./bootstrap"

describe("content bootstrap helpers", () => {
  test("claims the content runtime only once per extension context", () => {
    const globalScope: Record<string, unknown> = {}

    expect(claimContentRuntime(globalScope)).toBe(true)
    expect(globalScope[CONTENT_RUNTIME_MARKER]).toBe(true)
    expect(claimContentRuntime(globalScope)).toBe(false)
  })

  test("removes stale roots left by a previous extension context", () => {
    let removed = false
    const documentScope = {
      getElementById: () => ({
        remove: () => {
          removed = true
        }
      })
    }

    expect(removeExistingContentRoot(documentScope, "inspoclip-root")).toBe(true)
    expect(removed).toBe(true)
  })

  test("does nothing when no stale root exists", () => {
    const documentScope = { getElementById: () => null }

    expect(removeExistingContentRoot(documentScope, "inspoclip-root")).toBe(false)
  })
})
