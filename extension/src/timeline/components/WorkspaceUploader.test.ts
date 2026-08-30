import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceUploader } from "./WorkspaceUploader"

Object.assign(globalThis, { React })

describe("WorkspaceUploader", () => {
  test("accepts both images and videos from the workspace", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceUploader, {
      locale: "zh",
      onFiles: async () => undefined
    }))

    expect(html).toContain('accept="image/*,video/*"')
    expect(html).toContain("粘贴或拖拽素材")
  })
})
