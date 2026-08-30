import { describe, expect, test } from "vitest"

import { getIsDevelopmentBuild } from "./build-mode"

describe("extension build mode", () => {
  test("enables diagnostics only for development builds", () => {
    expect(getIsDevelopmentBuild("development")).toBe(true)
    expect(getIsDevelopmentBuild("production")).toBe(false)
  })

  test("fails closed when the build mode is unavailable", () => {
    expect(getIsDevelopmentBuild(undefined)).toBe(false)
  })
})
