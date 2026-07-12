import { describe, expect, test } from "vitest"

import { matchShortcut, normalizePressedKey } from "./shortcut"

describe("content shortcut helpers", () => {
  test("matches configured modifier shortcuts", () => {
    expect(matchShortcut({ key: "A", ctrlKey: true, altKey: false, shiftKey: true, metaKey: false }, "Ctrl+Shift+A")).toBe(true)
  })

  test("normalizes arrow and space keys", () => {
    expect(normalizePressedKey("ArrowLeft")).toBe("left")
    expect(normalizePressedKey(" ")).toBe("space")
  })

  test("rejects missing or mismatched modifiers", () => {
    expect(matchShortcut({ key: "A", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false }, "Ctrl+Shift+A")).toBe(false)
    expect(matchShortcut({ key: "A", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false }, "")).toBe(false)
  })
})
