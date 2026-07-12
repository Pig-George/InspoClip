import { describe, expect, test } from "vitest"

import { getManifestContentScriptFiles } from "./tabs"

describe("popup tab messaging helpers", () => {
  test("reads generated Plasmo content script files from the manifest", () => {
    expect(
      getManifestContentScriptFiles({
        content_scripts: [{ js: ["inspoclip.abc123.js"], css: [] } as { js: string[] }]
      })
    ).toEqual(["inspoclip.abc123.js"])
  })

  test("returns an empty list when the manifest has no content scripts", () => {
    expect(getManifestContentScriptFiles({})).toEqual([])
  })
})
