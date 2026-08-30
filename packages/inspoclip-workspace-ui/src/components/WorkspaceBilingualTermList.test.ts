import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceBilingualTermList } from "./WorkspaceBilingualTermList"

describe("WorkspaceBilingualTermList", () => {
  test("renders bilingual terms as individually copyable shared controls", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceBilingualTermList, {
      terms: [{ id: "term-1", en: "spring", zh: "弹簧" }],
      onCopy: () => undefined
    }))

    expect(html).toContain("workspace-design-terms")
    expect(html).toContain("workspace-design-term")
    expect(html).toContain("spring")
    expect(html).toContain("弹簧")
    expect(html).toContain("workspace-design-term-divider")
  })

  test("shows a copied indicator only for the selected language", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceBilingualTermList, {
      terms: [{ id: "term-1", en: "spring", zh: "弹簧" }],
      copiedId: "term-1-zh",
      copiedIcon: createElement("i", { className: "copied-icon" })
    }))

    expect(html).toContain("copied-icon")
    expect(html).toContain("workspace-design-term-check")
  })

  test("renders the supplied empty label for an empty analysis result", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceBilingualTermList, {
      terms: [],
      emptyLabel: "No terms"
    }))

    expect(html).toContain("workspace-design-terms-empty")
    expect(html).toContain("No terms")
  })
})
