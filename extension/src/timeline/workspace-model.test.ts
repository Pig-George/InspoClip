import { describe, expect, test } from "vitest"

import { buildIdeaDays, buildMonthGroups, buildWeekDays, dateKey, getMonday, groupAssetsByDate, initialDayIndex, parseStoredValue, promptText, searchWorkspaceAssets, type WorkspaceAsset } from "./workspace-model"

const asset = (id: string, createdAt: string, kind: "image" | "video" = "image"): WorkspaceAsset => ({
  id,
  kind,
  state: "saved",
  mode: "standalone",
  createdAt,
  updatedAt: createdAt,
  filename: `${id}.${kind === "image" ? "png" : "webm"}`
})

describe("workspace model", () => {
  test("normalizes dates in the local calendar and groups newest assets first", () => {
    const items = [asset("old", "2026-08-01T09:00:00.000Z"), asset("new", "2026-08-03T09:00:00.000Z", "video")]
    expect(dateKey(new Date("2026-08-03T09:00:00.000Z"))).toMatch(/^2026-08-0[23]$/)
    expect(groupAssetsByDate(items).map(([key, values]) => [key, values[0].id])).toHaveLength(2)
    expect(groupAssetsByDate(items)[0][1][0].id).toBe("new")
  })

  test("creates a Monday-first week with content attached to each date", () => {
    const monday = getMonday(new Date("2026-08-05T12:00:00"))
    const days = buildWeekDays([asset("monday", "2026-08-03T08:00:00"), asset("wednesday", "2026-08-05T08:00:00")], monday)
    expect(days).toHaveLength(7)
    expect(days[0]).toMatchObject({ isoDate: "2026-08-03", assets: [{ id: "monday" }] })
    expect(days[2]).toMatchObject({ isoDate: "2026-08-05", assets: [{ id: "wednesday" }] })
  })

  test("builds an ideas strip across distant weeks and keeps today as the final date", () => {
    const today = new Date("2026-08-06T12:00:00")
    const days = buildIdeaDays([
      asset("may", "2026-05-18T08:00:00"),
      asset("july", "2026-07-25T08:00:00", "video")
    ], today)

    expect(days.map((day) => day.isoDate)).toEqual(["2026-05-18", "2026-07-25", "2026-08-06"])
    expect(days[1].assets).toMatchObject([{ id: "july" }])
    expect(days[2]).toMatchObject({ isToday: true, assets: [] })
  })

  test("chooses today when present and the latest loaded day otherwise", () => {
    const days = buildIdeaDays([asset("old", "2026-08-03T08:00:00")], new Date("2026-08-06T12:00:00"))
    expect(initialDayIndex(days)).toBe(1)
    expect(initialDayIndex(days.filter((day) => !day.isToday))).toBe(0)
  })

  test("groups assets by month for the timeline view", () => {
    const groups = buildMonthGroups([asset("aug", "2026-08-03T08:00:00"), asset("jul", "2026-07-31T08:00:00")])
    expect(groups.map(([month]) => month)).toEqual(["2026-08", "2026-07"])
  })

  test("restores both raw string and JSON preferences", () => {
    expect(parseStoredValue("dark", "light")).toBe("dark")
    expect(parseStoredValue('"week"', "day")).toBe("week")
    expect(parseStoredValue(null, "day")).toBe("day")
  })

  test("reads image prompts and cached video prompts", () => {
    expect(promptText({ prompt: { en: "Image prompt", zh: "图片提示词" } }, "zh")).toBe("图片提示词")
    expect(promptText({ replicationPrompts: { general: { en: "Video prompt", zh: "视频提示词" } } }, "en")).toBe("Video prompt")
  })

  test("searches localized analysis summaries, terms and prompts", () => {
    const item = asset("analyzed", "2026-08-03T08:00:00")
    item.analysis = {
      summary: { en: "A spring interaction", zh: "弹簧交互动效" },
      designTerms: [{ en: "elastic easing", zh: "弹性缓动" }],
      prompt: { en: "Build a tactile button", zh: "制作一个有触感的按钮" }
    }

    expect(searchWorkspaceAssets([item], "弹性缓动")).toEqual([item])
    expect(searchWorkspaceAssets([item], "tactile button")).toEqual([item])
    expect(searchWorkspaceAssets([item], "not present")).toEqual([])
  })
})
