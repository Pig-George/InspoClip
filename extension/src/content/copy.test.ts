import { describe, expect, test } from "vitest"

import { getCopyButtonLabel } from "./copy"

describe("content copy button labels", () => {
  test("uses stable English text instead of emoji icons", () => {
    expect(getCopyButtonLabel("en")).toBe("Copy")
    expect(getCopyButtonLabel("en", "copied")).toBe("Copied")
  })

  test("uses stable Chinese text instead of emoji icons", () => {
    expect(getCopyButtonLabel("zh")).toBe("复制")
    expect(getCopyButtonLabel("zh", "copied")).toBe("已复制")
  })
})
