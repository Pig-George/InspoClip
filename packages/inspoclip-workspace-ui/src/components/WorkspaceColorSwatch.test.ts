import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceColorSwatch } from "./WorkspaceColorSwatch"

describe("WorkspaceColorSwatch", () => {
  test("renders a read-only color dot for workspace detail views", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceColorSwatch, {
      color: "#0E7490",
      title: "#0E7490",
      className: "workspace-color-swatch"
    }))

    expect(html).toContain("#0E7490")
    expect(html).toContain('style="background-color:#0E7490"')
    expect(html).not.toContain("<button")
  })

  test("renders an interactive labeled color item", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceColorSwatch, {
      color: "#F97316",
      label: "#F97316",
      onSelect: () => undefined,
      variant: "item",
      className: "palette-item",
      swatchClassName: "palette-swatch",
      labelClassName: "palette-label"
    }))

    expect(html).toContain("<button")
    expect(html).toContain("#F97316")
    expect(html).toContain("palette-swatch")
    expect(html).toContain("palette-label")
  })
})
