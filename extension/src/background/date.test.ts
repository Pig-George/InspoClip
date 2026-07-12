import { describe, expect, test } from "vitest"

import { formatDate, getExtensionDayOfWeek, getMonday } from "./date"

describe("background date helpers", () => {
  test("returns Monday for a mid-week date", () => {
    expect(formatDate(getMonday(new Date("2026-07-09T12:00:00.000Z")))).toBe("2026-07-06")
  })

  test("maps Sunday to the last day of the extension week", () => {
    expect(getExtensionDayOfWeek(new Date("2026-07-12T12:00:00.000Z"))).toBe(6)
  })
})
