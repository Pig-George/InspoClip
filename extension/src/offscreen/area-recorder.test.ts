import { describe, expect, test } from "vitest"

import { getAreaRecordingSourceRect, getTabCaptureMediaConstraints } from "./area-recorder"

describe("offscreen area recorder helpers", () => {
  test("creates tab capture media constraints", () => {
    expect(getTabCaptureMediaConstraints("stream-1")).toEqual({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: "stream-1"
        }
      }
    })
  })

  test("maps viewport coordinates to native tab stream pixels", () => {
    expect(getAreaRecordingSourceRect(
      { x: 10, y: 20, width: 200, height: 100 },
      { width: 1600, height: 1200 },
      { width: 800, height: 600 }
    )).toEqual({ x: 20, y: 40, width: 400, height: 200 })
  })
})
