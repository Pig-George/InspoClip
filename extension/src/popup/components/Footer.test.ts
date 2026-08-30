import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import type { I18nMessages } from "../types"
import { Footer } from "./Footer"

describe("Footer", () => {
  test("shows only the workspace action", () => {
    const markup = renderToStaticMarkup(createElement(Footer, {
      t: { openInspoClip: "Open InspoClip workspace" } as I18nMessages,
      onOpenApp: () => undefined
    }))

    expect(markup).toContain("Open InspoClip workspace")
    expect(markup).not.toContain("footer-version")
  })
})
