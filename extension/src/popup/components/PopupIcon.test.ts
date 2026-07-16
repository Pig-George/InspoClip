import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { PopupIcon } from "./PopupIcon"

describe("PopupIcon", () => {
  test("renders tree-shaken Lucide icon nodes as accessible-hidden SVG", () => {
    const markup = renderToStaticMarkup(createElement(PopupIcon, { name: "scan" }))

    expect(markup).toContain("<svg")
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('data-popup-icon="scan"')
    expect(markup).not.toMatch(/[🔍📷✂️🖼️]/u)
  })
})
