import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceStageList } from "./WorkspaceStageList"

describe("WorkspaceStageList", () => {
  test("renders localized stage timing, state transition and actions", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceStageList, {
      locale: "zh",
      stages: [{
        id: "open",
        title: { en: "Panel opens", zh: "面板打开" },
        startSeconds: 1.2,
        endSeconds: 2,
        initialState: { en: "Closed", zh: "关闭" },
        trigger: { en: "Tap", zh: "点击" },
        resultState: { en: "Open", zh: "打开" },
        actions: [{ subject: { en: "Card", zh: "卡片" }, action: { en: "Slides up", zh: "向上滑入" }, durationMs: 400, easing: "ease-out" }]
      }]
    }))

    expect(html).toContain("面板打开")
    expect(html).toContain("1.2s - 2.0s")
    expect(html).toContain("关闭 → 点击 → 打开")
    expect(html).toContain("卡片：向上滑入 · 400ms · ease-out")
    expect(html).toContain('workspace-stage-list')
    expect(html).toContain('workspace-stage-button')
    expect(html).toContain('workspace-stage-heading')
    expect(html).not.toMatch(/\b(w-full|rounded-xl|border-|bg-|p-\d|text-|shrink-0|mt-\d|flex|items-|justify-|gap-)/)
  })
})
