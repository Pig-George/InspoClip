import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { PageAnalysisSection, getPageAnalysisPresentation } from "./PageAnalysisSection"

describe("PageAnalysisSection", () => {
  test("uses area selection as the default page analysis scope", () => {
    expect(getPageAnalysisPresentation("area", I18N.zh)).toEqual({
      label: "分析当前区域",
      hint: "框选后选择截图或录屏"
    })
  })

  test("updates the primary action copy for full-page analysis", () => {
    expect(getPageAnalysisPresentation("page", I18N.en)).toEqual({
      label: "Analyze full page",
      hint: "Understand the complete visual content of this page"
    })
  })

  test("renders one primary analysis action without a quick-save action", () => {
    const markup = renderToStaticMarkup(createElement(PageAnalysisSection, {
      analyzing: false,
      captureMode: "area",
      currentPageLabel: "dribbble.com/shots/interaction",
      shortcutAnalyze: "Ctrl+Shift+A",
      t: I18N.zh,
      onAnalyze: vi.fn(),
      onChangeMode: vi.fn()
    }))

    expect(markup).toContain("分析当前区域")
    expect(markup).toContain("区域框选")
    expect(markup).toContain("完整页面")
    expect(markup).not.toContain("快速保存")
  })

  test("renders the current analysis shortcut instead of a fixed key combination", () => {
    const markup = renderToStaticMarkup(createElement(PageAnalysisSection, {
      analyzing: false,
      captureMode: "area",
      currentPageLabel: "example.com",
      shortcutAnalyze: "Alt+P",
      t: I18N.en,
      onAnalyze: vi.fn(),
      onChangeMode: vi.fn()
    }))

    expect(markup).toContain("<kbd>Alt</kbd>")
    expect(markup).toContain("<kbd>P</kbd>")
    expect(markup).not.toContain("<kbd>Ctrl</kbd>")
  })
})
