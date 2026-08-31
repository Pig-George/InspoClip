import { describe, expect, test } from "vitest"

import { getIsDevelopmentBuild } from "./build-mode"

describe("extension build mode", () => {
  test("enables diagnostics only for development builds", () => {
    expect(getIsDevelopmentBuild("development")).toBe(true)
    expect(getIsDevelopmentBuild("production")).toBe(false)
  })

  test("enables diagnostics for a Plasmo development tag", () => {
    expect(getIsDevelopmentBuild("production", "dev")).toBe(true)
    expect(getIsDevelopmentBuild("production", "prod")).toBe(false)
  })

  test("fails closed when the build mode is unavailable", () => {
    expect(getIsDevelopmentBuild(undefined, undefined)).toBe(false)
  })
})
