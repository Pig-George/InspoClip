import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import { WorkspaceUploadSurface } from "./WorkspaceUploadSurface"

describe("WorkspaceUploadSurface", () => {
  test("renders shared upload, progress and input structure", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceUploadSurface, {
      label: "Paste or drop",
      busyLabel: "Uploading",
      onFiles: () => undefined,
      busy: true,
      progress: { current: 2, total: 4 }
    }))

    expect(html).toContain('class="workspace-uploader is-uploading"')
    expect(html).toContain('class="workspace-uploader-progress"')
    expect(html).toContain('class="workspace-uploader-progress-bar"')
    expect(html).toContain('class="workspace-uploader-label"')
    expect(html).toContain('type="file"')
    expect(html).toContain('accept="image/*,video/*"')
  })
})
