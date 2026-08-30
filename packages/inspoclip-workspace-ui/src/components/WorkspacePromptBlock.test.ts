import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspacePromptBlock } from "./WorkspacePromptBlock"

describe("WorkspacePromptBlock", () => {
  test("renders both localized prompt variants with a separator", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptBlock, {
      contentEn: "Build a tactile card",
      contentZh: "制作一个有触感的卡片",
      showEn: true,
      showZh: true,
      renderContent: (value) => createElement("p", null, value)
    }))

    expect(html).toContain("Build a tactile card")
    expect(html).toContain("制作一个有触感的卡片")
    expect(html).toContain('workspace-prompt-card')
    expect(html).toContain('workspace-prompt-separator')
    expect(html).toContain('workspace-prompt-text')
    expect(html).not.toMatch(/\b(space-y|rounded-|border-|bg-|p-\d|text-|overflow-wrap)/)
  })

  test("renders structured output as formatted JSON", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptBlock, {
      contentEn: '{"duration": 400}',
      showEn: true,
      showZh: false,
      isJson: true
    }))

    expect(html).toContain('&quot;duration&quot;: 400')
    expect(html).toContain("workspace-prompt-json")
    expect(html).not.toContain("font-mono")
  })
})
