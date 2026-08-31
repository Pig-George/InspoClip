import { describe, expect, test } from "vitest"

import { assetDetailTitle, assetTitle, localized, localizedPrompt, stageEndSeconds, stageStartSeconds, weekHeading } from "./presentation"

describe("timeline presentation", () => {
  test("formats the client-style localized week heading", () => {
    const monday = new Date("2026-08-03T00:00:00")
    expect(weekHeading(monday, "zh")).toMatchObject({ label: "第 32 周" })
    expect(weekHeading(monday, "en")).toMatchObject({ label: "Week 32" })
  })

  test("reads numeric and timestamp stage starts for video seeking", () => {
    expect(stageStartSeconds({ startSeconds: 4.5 })).toBe(4.5)
    expect(stageStartSeconds({ startTime: "01:12" })).toBe(72)
    expect(stageStartSeconds({ from: "00:01:03" })).toBe(63)
    expect(stageStartSeconds({ trigger: "click" })).toBeNull()
  })

  test("reads numeric and timestamp stage ends for timeline ranges", () => {
    expect(stageEndSeconds({ endSeconds: 4.5 })).toBe(4.5)
    expect(stageEndSeconds({ endTime: "00:01:12" })).toBe(72)
    expect(stageEndSeconds({ to: "01:03" })).toBe(63)
    expect(stageEndSeconds({ trigger: "click" })).toBeNull()
  })

  test("hides LangChain internal metadata from cached analysis display", () => {
    expect(localized({ zh: "langchain_coremessages", en: "langchain.core.messages" }, "zh")).toBe("")
    expect(localizedPrompt({ en: "langchain_core.messages", zh: "正常提示词" })).toEqual({ en: "", zh: "正常提示词" })
    expect(assetTitle({ title: "langchain_coremessages", filename: "capture.mp4" }, "zh", "未命名灵感")).toBe("未命名灵感")
  })

  test("uses type-specific detail titles for image and video dialogs", () => {
    expect(assetDetailTitle("image", "zh")).toBe("图片详情")
    expect(assetDetailTitle("video", "zh")).toBe("视频详情")
    expect(assetDetailTitle("image", "en")).toBe("Image Detail")
    expect(assetDetailTitle("video", "en")).toBe("Video Detail")
  })
})
