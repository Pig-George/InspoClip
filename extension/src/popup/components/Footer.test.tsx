import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test, vi } from "vitest"

import { I18N } from "../constants"
import { Footer } from "./Footer"

describe("Footer runtime mode visibility", () => {
  test("hides the workspace link in standalone mode", () => {
    const markup = renderToStaticMarkup(createElement(Footer, {
      onOpenApp: vi.fn(),
      showWorkspaceLink: false,
      t: I18N.en
    }))

    expect(markup).not.toContain("Open InspoClip")
  })
})
