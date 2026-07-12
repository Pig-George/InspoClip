import { describe, expect, test } from "vitest"

import { dataUrlToBlob } from "./image"

describe("background image helpers", () => {
  test("converts a data URL into a typed blob", async () => {
    const blob = dataUrlToBlob("data:image/png;base64,eA==")

    expect(blob.type).toBe("image/png")
    expect(await blob.text()).toBe("x")
  })
})
