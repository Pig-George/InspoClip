import { describe, expect, test } from "vitest"

import { getExtensionIconPath } from "./assets"

describe("popup asset helpers", () => {
  test("uses the generated Plasmo icon path from the runtime manifest", () => {
    expect(getExtensionIconPath({ icons: { "48": "icon48.plasmo.hash.png" } })).toBe("icon48.plasmo.hash.png")
  })

  test("falls back to another manifest icon when the preferred size is missing", () => {
    expect(getExtensionIconPath({ icons: { "128": "icon128.plasmo.hash.png" } })).toBe("icon128.plasmo.hash.png")
  })

  test("keeps a legacy fallback for unpackaged environments", () => {
    expect(getExtensionIconPath({})).toBe("assets/icon48.png")
  })
})
