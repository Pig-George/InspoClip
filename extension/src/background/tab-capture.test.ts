import { describe, expect, test } from "vitest"

import { getTabCaptureStreamOptions } from "./tab-capture"

describe("tab capture helpers", () => {
  test("targets and consumes the stream from the same active tab", () => {
    expect(getTabCaptureStreamOptions(42)).toEqual({
      targetTabId: 42,
      consumerTabId: 42
    })
  })
})
