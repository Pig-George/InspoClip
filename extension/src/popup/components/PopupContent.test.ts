import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { PopupContent } from "./PopupContent"

describe("PopupContent", () => {
  test("keeps asset analysis above current-page analysis on one screen", () => {
    const markup = renderToStaticMarkup(createElement(PopupContent, {
      assetSection: createElement("section", { "data-section": "asset" }, "Asset"),
      pageAnalysisSection: createElement("section", { "data-section": "page" }, "Page")
    }))

    expect(markup.indexOf('data-section="asset"')).toBeLessThan(markup.indexOf('data-section="page"'))
    expect(markup).not.toContain("mode-toggle")
    expect(markup).not.toContain("popup-tabs")
  })
})
