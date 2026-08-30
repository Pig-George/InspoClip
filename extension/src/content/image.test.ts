import { describe, expect, test } from "vitest"

import { createImagePreviewUrl } from "./image"

describe("image preview helpers", () => {
  test("creates a preview URL for every analyzed image blob", () => {
    const blob = new Blob(["page capture"], { type: "image/png" })
    const createObjectUrl = (value: Blob) => `blob:preview-${value.size}`

    expect(createImagePreviewUrl(blob, createObjectUrl)).toBe("blob:preview-12")
  })
})
