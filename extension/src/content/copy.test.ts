import { describe, expect, test } from "vitest"

import { getCopyButtonIcon, getCopyButtonTitle } from "./copy"

describe("content copy button labels", () => {
  test("uses localized accessible titles", () => {
    expect(getCopyButtonTitle("en")).toBe("Copy")
    expect(getCopyButtonTitle("en", "copied")).toBe("Copied")
    expect(getCopyButtonTitle("zh")).toBe("复制")
    expect(getCopyButtonTitle("zh", "copied")).toBe("已复制")
  })

  test("uses inline SVG icons instead of emoji glyphs", () => {
    expect(getCopyButtonIcon()).toContain("<svg")
    expect(getCopyButtonIcon()).toContain("<rect")
    expect(getCopyButtonIcon("copied")).toContain("<svg")
    expect(getCopyButtonIcon("copied")).toContain("<path")
    expect(getCopyButtonIcon()).not.toContain("📋")
  })
})
