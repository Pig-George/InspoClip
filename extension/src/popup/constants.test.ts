import { describe, expect, test } from "vitest"

import { I18N } from "./constants"

describe("popup settings copy", () => {
  test("does not advertise model configuration as a future feature", () => {
    expect(I18N.en.standaloneModeHint).toBe("Assets stay in this browser.")
    expect(I18N.zh.standaloneModeHint).toBe("素材保存在当前浏览器。")
    expect(I18N.en.standaloneModeHint).not.toContain("later")
    expect(I18N.zh.standaloneModeHint).not.toContain("后续阶段开放")
  })
})
