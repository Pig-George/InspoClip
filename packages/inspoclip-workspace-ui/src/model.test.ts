import { describe, expect, test } from "vitest"

import { buildIdeaDays, promptText, searchWorkspaceAssets, workspaceTitle, type WorkspaceAsset } from "./model"

const asset = (id: string, createdAt: string, kind: "image" | "video" = "image"): WorkspaceAsset => ({
  id,
  kind,
  createdAt,
  titleZh: "中文标题",
  titleEn: "English title"
})

describe("workspace UI model", () => {
  test("normalizes a localized title and prompt for both products", () => {
    const item = asset("image", "2026-08-03T08:00:00")
    item.analysis = { prompt: { zh: "中文 Prompt", en: "English prompt" } }

    expect(workspaceTitle(item, "zh", "Untitled")).toBe("中文标题")
    expect(promptText(item.analysis, "en")).toBe("English prompt")
  })

  test("searches shared titles, tags and structured analysis content", () => {
    const item = asset("motion", "2026-08-03T08:00:00", "video")
    item.tags = ["交互动效"]
    item.analysis = { designTerms: [{ zh: "弹性缓动", en: "elastic easing" }] }

    expect(searchWorkspaceAssets([item], "elastic")).toEqual([item])
    expect(searchWorkspaceAssets([item], "交互动效")).toEqual([item])
  })

  test("builds an ascending ideas strip with the current day included", () => {
    const days = buildIdeaDays([
      asset("may", "2026-05-18T08:00:00"),
      asset("july", "2026-07-25T08:00:00")
    ], new Date("2026-08-08T12:00:00"))

    expect(days.map((day) => day.isoDate)).toEqual(["2026-05-18", "2026-07-25", "2026-08-08"])
  })
})
