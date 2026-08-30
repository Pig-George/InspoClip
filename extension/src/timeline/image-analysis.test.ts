import { describe, expect, test } from "vitest"

import { normalizeImageAnalysis } from "./image-analysis"

describe("normalizeImageAnalysis", () => {
  test("maps backend terminology and keeps its color palette", () => {
    expect(normalizeImageAnalysis({
      terms: ["glass card / 毛玻璃卡片"],
      colors: ["#3377cc"],
      prompt: { en: "A glass card", zh: "毛玻璃卡片" }
    })).toEqual({
      terms: ["glass card / 毛玻璃卡片"],
      designTerms: ["glass card / 毛玻璃卡片"],
      colors: ["#3377cc"],
      prompt: { en: "A glass card", zh: "毛玻璃卡片" }
    })
  })

  test("lifts colors and terminology from visualStyle when needed", () => {
    expect(normalizeImageAnalysis({
      visualStyle: {
        colors: ["#f0b43c"],
        designTerms: ["card layout / 卡片布局"]
      }
    })).toMatchObject({
      terms: ["card layout / 卡片布局"],
      designTerms: ["card layout / 卡片布局"],
      colors: ["#f0b43c"]
    })
  })

  test("falls back to non-empty legacy fields instead of an empty alias", () => {
    expect(normalizeImageAnalysis({
      designTerms: [],
      terms: ["soft shadow / 柔和阴影"],
      colors: [],
      visualStyle: { colors: ["#111111"] }
    })).toMatchObject({
      terms: ["soft shadow / 柔和阴影"],
      designTerms: ["soft shadow / 柔和阴影"],
      colors: ["#111111"]
    })
  })

  test("does not discard unrelated analysis fields", () => {
    expect(normalizeImageAnalysis({ summary: "image", terms: [] })).toMatchObject({ summary: "image", terms: [], designTerms: [], colors: [] })
  })
})
