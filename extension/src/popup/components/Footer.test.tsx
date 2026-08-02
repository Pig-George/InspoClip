import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { Footer } from "./Footer"

describe("Footer runtime mode visibility", () => {
  test("keeps the workspace link available for standalone timeline navigation", () => {
    const markup = renderToStaticMarkup(createElement(Footer, {
      onOpenApp: vi.fn(),
      t: I18N.en
    }))

    expect(markup).toContain("Open InspoClip")
  })
})
