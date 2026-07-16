import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { BrandLogoButton } from "./BrandLogoButton"

describe("BrandLogoButton", () => {
  test("renders an accessible transparent logo control with animation decorations", () => {
    const markup = renderToStaticMarkup(createElement(BrandLogoButton, {
      iconUrl: "chrome-extension://test/icon48.png"
    }))

    expect(markup).toContain('class="brand-logo-button"')
    expect(markup).toContain('aria-label="Animate InspoClip logo"')
    expect(markup).toContain('class="brand-logo-motion"')
    expect(markup).toContain('class="brand-logo-spark brand-logo-spark-one"')
    expect(markup).toContain('class="brand-logo-spark brand-logo-spark-two"')
    expect(markup).toContain('class="logo"')
  })
})
