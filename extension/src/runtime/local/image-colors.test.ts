import { describe, expect, test } from "vitest"

import { extractColorPalette } from "./image-colors"

describe("extractColorPalette", () => {
  test("returns a diverse palette sorted by hue from RGBA image pixels", () => {
    const pixels = new Uint8ClampedArray([
      51, 119, 204, 255,
      51, 119, 204, 255,
      240, 180, 60, 255,
      240, 180, 60, 255
    ])

    expect(extractColorPalette(pixels, 2, 2)).toEqual(["#f0b040", "#3070d0"])
  })

  test("ignores fully transparent pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 0,
      51, 119, 204, 255
    ])

    expect(extractColorPalette(pixels, 2, 1)).toEqual(["#3070d0"])
  })
})
