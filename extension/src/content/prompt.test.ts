import { describe, expect, test } from "vitest"

import { getPromptText } from "./prompt"

describe("content prompt helpers", () => {
  test("uses locale when language mode is auto", () => {
    expect(getPromptText({ en: "English", zh: "中文" }, "auto", "zh")).toBe("中文")
    expect(getPromptText({ en: "English", zh: "中文" }, "auto", "en")).toBe("English")
  })

  test("falls back when requested language is missing", () => {
    expect(getPromptText({ en: "English" }, "zh", "zh")).toBe("English")
  })

  test("joins both languages for both mode", () => {
    expect(getPromptText({ en: "English", zh: "中文" }, "both", "en")).toBe("English\n\n中文")
  })
})
