import { describe, expect, test } from "vitest"

import { getAreaRecordingSourceRect, getOffscreenRecordingFrameIntervalMs, getTabCaptureMediaConstraints } from "./area-recorder"

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

  test("maps horizontal coordinates with layout viewport width when scrollbar is present", () => {
    expect(getAreaRecordingSourceRect(
      { x: 100, y: 20, width: 200, height: 100 },
      { width: 1600, height: 1200 },
      { width: 817, height: 600, clientWidth: 800, clientHeight: 600 }
    )).toEqual({ x: 200, y: 40, width: 400, height: 200 })
  })

  test("applies capture left inset when tab capture frame starts before the layout viewport", () => {
    expect(getAreaRecordingSourceRect(
      { x: 100, y: 20, width: 200, height: 100 },
      { width: 1600, height: 1200 },
      {
        width: 817,
        height: 600,
        clientWidth: 800,
        clientHeight: 600,
        captureInsetLeft: 8.5
      }
    )).toEqual({ x: 217, y: 40, width: 400, height: 200 })
  })

  test("applies visual viewport offsets before mapping to native tab stream pixels", () => {
    expect(getAreaRecordingSourceRect(
      { x: 10, y: 20, width: 100, height: 80 },
      { width: 1000, height: 800 },
      {
        width: 1000,
        height: 800,
        clientWidth: 1000,
        clientHeight: 800,
        visualOffsetLeft: 100,
        visualOffsetTop: 50,
        visualWidth: 500,
        visualHeight: 400,
        visualScale: 2
      }
    )).toEqual({ x: 110, y: 70, width: 100, height: 80 })
  })

  test("clamps mapped source rect inside the native tab stream", () => {
    expect(getAreaRecordingSourceRect(
      { x: 790, y: 590, width: 100, height: 100 },
      { width: 800, height: 600 },
      { width: 800, height: 600, clientWidth: 800, clientHeight: 600 }
    )).toEqual({ x: 790, y: 590, width: 10, height: 10 })
  })

  test("uses a fixed timer interval suitable for offscreen recording", () => {
    expect(getOffscreenRecordingFrameIntervalMs(30)).toBe(33)
    expect(getOffscreenRecordingFrameIntervalMs(60)).toBe(33)
    expect(getOffscreenRecordingFrameIntervalMs(10)).toBe(100)
  })
})
