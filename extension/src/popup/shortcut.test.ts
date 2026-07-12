import { describe, expect, test } from "vitest"

import { formatShortcut, normalizeShortcutKey } from "./shortcut"

describe("popup shortcut helpers", () => {
  test("formats modifier combinations with normalized key names", () => {
    expect(formatShortcut({ key: "a", ctrlKey: true, altKey: false, shiftKey: true, metaKey: false })).toBe("Ctrl+Shift+A")
    expect(formatShortcut({ key: "ArrowDown", ctrlKey: false, altKey: true, shiftKey: false, metaKey: false })).toBe("Alt+Down")
  })

  test("ignores modifier-only key presses", () => {
    expect(formatShortcut({ key: "Control", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false })).toBeNull()
  })

  test("normalizes space and single letter keys", () => {
    expect(normalizeShortcutKey(" ")).toBe("Space")
    expect(normalizeShortcutKey("x")).toBe("X")
  })
})
