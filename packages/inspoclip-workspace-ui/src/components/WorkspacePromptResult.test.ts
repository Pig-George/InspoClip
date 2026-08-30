import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspacePromptResult } from "./WorkspacePromptResult"

describe("WorkspacePromptResult", () => {
  test("renders a shared generation action when no prompt exists", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptResult, {
      hasPrompt: false,
      generating: false,
      emptyLabel: "No prompt",
      generatingLabel: "Generating...",
      generateLabel: "Generate prompt",
      generateIcon: createElement("i", { className: "sparkles" }),
      onGenerate: () => undefined
    }))

    expect(html).toContain("workspace-prompt-result")
    expect(html).toContain("workspace-no-prompt")
    expect(html).toContain('aria-label="No prompt"')
    expect(html).toContain("Generate prompt")
    expect(html).toContain("sparkles")
  })

  test("keeps the empty state visually identical to the legacy prompt action", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptResult, {
      hasPrompt: false,
      generating: false,
      emptyLabel: "No prompt",
      generatingLabel: "Generating...",
      generateLabel: "Generate prompt",
      generateIcon: createElement("i")
    }))

    expect(html).not.toContain("No prompt</span>")
    expect(html).toContain('class="workspace-prompt-generate"')
    expect(html).not.toContain("workspace-prompt-loading")
  })

  test("keeps an existing prompt visible while its regenerate action is busy", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptResult, {
      hasPrompt: true,
      generating: true,
      emptyLabel: "No prompt",
      generatingLabel: "Generating...",
      generateLabel: "Generate prompt"
    }, createElement("div", { className: "prompt-output" }, "Existing prompt")))

    expect(html).toContain("prompt-output")
    expect(html).toContain("Existing prompt")
    expect(html).not.toContain("Generating...")
    expect(html).not.toContain("Generate prompt")
  })

  test("shows the generating label without rendering a second generate action", () => {
    const html = renderToStaticMarkup(createElement(WorkspacePromptResult, {
      hasPrompt: false,
      generating: true,
      emptyLabel: "No prompt",
      generatingLabel: "Generating...",
      generateLabel: "Generate prompt",
      onGenerate: () => undefined
    }))

    expect(html).toContain("Generating...")
    expect(html).not.toContain("Generate prompt")
  })
})
