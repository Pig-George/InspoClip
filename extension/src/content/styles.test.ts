import { describe, expect, test } from "vitest"

import { getContentStyles } from "./styles"

describe("content styles", () => {
  test("shrinks the recording overlay so it cannot cover the page hit area", () => {
    const styles = getContentStyles()
    const recordingRule = styles.match(/\.inspoclip-area-overlay-recording\s*\{([^}]*)\}/)?.[1] || ""

    expect(recordingRule).toContain("pointer-events: none")
    expect(recordingRule).toContain("width: 0")
    expect(recordingRule).toContain("height: 0")
    expect(recordingRule).toContain("overflow: visible")
  })
})
