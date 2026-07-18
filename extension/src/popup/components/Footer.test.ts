import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import type { I18nMessages } from "../types"
import { Footer } from "./Footer"

describe("Footer", () => {
  test("shows the extension version beside the workspace action", () => {
    const markup = renderToStaticMarkup(createElement(Footer, {
      t: { openInspoClip: "Open InspoClip workspace" } as I18nMessages,
      version: "1.5.0",
      onOpenApp: () => undefined
    }))

    expect(markup).toContain("Open InspoClip workspace")
    expect(markup).toContain('class="footer-version"')
    expect(markup).toContain("v1.5.0")
  })
})
