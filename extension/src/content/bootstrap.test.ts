import { describe, expect, test } from "vitest"

import {
  CONTENT_RUNTIME_MARKER,
  claimContentRuntime,
  removeExistingContentRoot,
  setContentRootInteractive,
  shouldExpandContentRoot
} from "./bootstrap"

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

  test("expands the content root while interactive overlays are visible", () => {
    const root = { style: { cssText: "" } }

    setContentRootInteractive(root, true)

    expect(root.style.cssText).toContain("width:100vw")
    expect(root.style.cssText).toContain("height:100vh")
    expect(root.style.cssText).toContain("pointer-events:none")

    setContentRootInteractive(root, false)

    expect(root.style.cssText).toContain("width:0")
    expect(root.style.cssText).toContain("height:0")
    expect(root.style.cssText).toContain("overflow:visible")
  })

  test("collapses the content root while area recording lets the page stay interactive", () => {
    expect(shouldExpandContentRoot({
      hasModal: false,
      hasAreaOverlay: true,
      isAreaRecording: true
    })).toBe(false)

    expect(shouldExpandContentRoot({
      hasModal: false,
      hasAreaOverlay: true,
      isAreaRecording: false
    })).toBe(true)

    expect(shouldExpandContentRoot({
      hasModal: true,
      hasAreaOverlay: true,
      isAreaRecording: true
    })).toBe(true)
  })
})
