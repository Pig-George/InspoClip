import { describe, expect, test } from "vitest"

import {
  AREA_RECORDING_DELAY_OPTIONS,
  AREA_RESIZE_HANDLES,
  DEFAULT_AREA_RECORDING_AUDIO_ENABLED,
  DEFAULT_AREA_RECORDING_DELAY_SECONDS,
  createAreaRecordingStartMessage,
  createAreaRecordingTimerState,
  formatRecordingDuration,
  getAreaResizeHandlesMarkup,
  getAreaRecordingInnerRect,
  getAreaRecordingSourceRect,
  getAreaCaptureToolbarPosition,
  getAreaToolbarActionIcon,
  getAreaToolbarActionLabel,
  getAreaRecordingDelayLabel,
  getNextAreaRecordingDelay,
  getPreferredRecordingMimeType,
  getRecordingUploadMimeType,
  moveAreaRect,
  normalizeAreaRecordingDelay,
  resizeAreaRect
} from "./area-recording"

describe("area recording helpers", () => {
  test("localizes every area toolbar action", () => {
    expect(getAreaToolbarActionLabel("screenshot", "zh")).toBe("截图")
    expect(getAreaToolbarActionLabel("record", "en")).toBe("Start recording")
    expect(getAreaToolbarActionLabel("sound-on", "zh")).toBe("录制标签页声音：已开启")
    expect(getAreaToolbarActionLabel("sound-off", "en")).toBe("Record tab audio: off")
    expect(getAreaToolbarActionLabel("cancel", "zh")).toBe("取消")
    expect(getAreaToolbarActionLabel("pause", "en")).toBe("Pause")
    expect(getAreaToolbarActionLabel("resume", "zh")).toBe("继续")
    expect(getAreaToolbarActionLabel("retake", "en")).toBe("Retake")
    expect(getAreaToolbarActionLabel("confirm-retake", "zh")).toBe("再次点击确认重录")
    expect(getAreaToolbarActionLabel("finish", "en")).toBe("Finish and analyze")
  })

  test("renders every toolbar action as a Lucide placeholder without hand-written svg", () => {
    const actions = [
      "screenshot",
      "record",
      "sound-on",
      "sound-off",
      "cancel",
      "pause",
      "resume",
      "retake",
      "confirm-retake",
      "delay",
      "finish"
    ] as const

    actions.forEach((action) => {
      const icon = getAreaToolbarActionIcon(action)
      expect(icon).toContain("data-lucide=")
      expect(icon).toContain('aria-hidden="true"')
      expect(icon).not.toContain("<svg")
      expect(icon).not.toMatch(/[📷🎥🔊🔇⏸▶↻✅❌]/u)
    })
  })

  test("keeps tab audio disabled by default", () => {
    expect(DEFAULT_AREA_RECORDING_AUDIO_ENABLED).toBe(false)
  })

  test("uses a remembered three-second recording delay by default", () => {
    expect(AREA_RECORDING_DELAY_OPTIONS).toEqual([0, 3, 5])
    expect(DEFAULT_AREA_RECORDING_DELAY_SECONDS).toBe(3)
  })

  test.each([
    [undefined, 3],
    [null, 3],
    ["3", 3],
    [0, 0],
    [3, 3],
    [5, 5],
    [4, 3],
    [-1, 3]
  ])("normalizes a stored recording delay of %s", (value, expected) => {
    expect(normalizeAreaRecordingDelay(value)).toBe(expected)
  })

  test("cycles recording delay through off, three seconds, and five seconds", () => {
    expect(getNextAreaRecordingDelay(0)).toBe(3)
    expect(getNextAreaRecordingDelay(3)).toBe(5)
    expect(getNextAreaRecordingDelay(5)).toBe(0)
    expect(getNextAreaRecordingDelay(99)).toBe(5)
  })

  test("localizes the current recording delay", () => {
    expect(getAreaRecordingDelayLabel(0, "zh")).toBe("录屏延时：关闭")
    expect(getAreaRecordingDelayLabel(3, "zh")).toBe("录屏延时：3 秒")
    expect(getAreaRecordingDelayLabel(0, "en")).toBe("Recording delay: off")
    expect(getAreaRecordingDelayLabel(5, "en")).toBe("Recording delay: 5 seconds")
  })

  test("includes the selected tab audio option in the start message", () => {
    expect(createAreaRecordingStartMessage({
      recordingId: "recording-1",
      sourceId: "source-1",
      rect: { x: 10, y: 20, width: 300, height: 180 },
      viewport: { width: 1200, height: 800 },
      includeTabAudio: true
    })).toEqual({
      type: "START_AREA_RECORDING",
      recordingId: "recording-1",
      sourceId: "source-1",
      rect: { x: 10, y: 20, width: 300, height: 180 },
      viewport: { width: 1200, height: 800 },
      includeTabAudio: true
    })
  })

  test("creates a fresh timer state for a retake", () => {
    expect(createAreaRecordingTimerState(42_000)).toEqual({
      startedAt: 42_000,
      pausedAt: 0,
      pausedTotal: 0
    })
  })

  test("right-aligns the toolbar below the selected area when there is enough room", () => {
    const position = getAreaCaptureToolbarPosition(
      { x: 100, y: 120, width: 240, height: 120 },
      { width: 800, height: 600 },
      { width: 260, height: 44 }
    )

    expect(position.placement).toBe("bottom")
    expect(position.top).toBe(252)
    expect(position.left).toBe(80)
  })

  test("places the toolbar above the selected area when bottom space is not enough", () => {
    const position = getAreaCaptureToolbarPosition(
      { x: 100, y: 520, width: 240, height: 60 },
      { width: 800, height: 600 },
      { width: 260, height: 44 }
    )

    expect(position.placement).toBe("top")
    expect(position.top).toBe(464)
  })

  test("keeps toolbar inside viewport horizontally", () => {
    const position = getAreaCaptureToolbarPosition(
      { x: 4, y: 80, width: 50, height: 40 },
      { width: 320, height: 480 },
      { width: 260, height: 44 }
    )

    expect(position.left).toBe(12)
  })

  test("keeps a right-aligned toolbar inside the viewport right edge", () => {
    const position = getAreaCaptureToolbarPosition(
      { x: 760, y: 80, width: 30, height: 40 },
      { width: 800, height: 600 },
      { width: 260, height: 44 }
    )

    expect(position.left).toBe(528)
  })

  test("formats recording duration as mm:ss", () => {
    expect(formatRecordingDuration(0)).toBe("00:00")
    expect(formatRecordingDuration(65_000)).toBe("01:05")
  })

  test("returns an inner recording rect that excludes the visible selection border", () => {
    expect(getAreaRecordingInnerRect({ x: 100, y: 80, width: 240, height: 120 }, 2)).toEqual({
      x: 102,
      y: 82,
      width: 236,
      height: 116
    })
  })

  test("keeps inner recording rect valid for tiny selections", () => {
    expect(getAreaRecordingInnerRect({ x: 10, y: 20, width: 3, height: 3 }, 2)).toEqual({
      x: 11,
      y: 21,
      width: 1,
      height: 1
    })
  })

  test("chooses the first supported recording mime type", () => {
    const mediaRecorder = {
      isTypeSupported: (value: string) => value === "video/webm;codecs=vp9"
    }

    expect(getPreferredRecordingMimeType(mediaRecorder)).toBe("video/webm;codecs=vp9")
  })

  test("normalizes recording mime type before uploading", () => {
    expect(getRecordingUploadMimeType("video/webm;codecs=vp9")).toBe("video/webm")
    expect(getRecordingUploadMimeType(" video/webm; codecs=vp8 ")).toBe("video/webm")
    expect(getRecordingUploadMimeType("")).toBe("video/webm")
  })

  test("maps viewport selection to tab capture source pixels", () => {
    expect(getAreaRecordingSourceRect(
      { x: 50, y: 80, width: 200, height: 120 },
      { width: 1600, height: 1200 },
      { width: 800, height: 600 }
    )).toEqual({ x: 100, y: 160, width: 400, height: 240 })
  })

  test("defines all eight area resize handles", () => {
    expect(AREA_RESIZE_HANDLES).toEqual(["nw", "n", "ne", "e", "se", "s", "sw", "w"])
  })

  test("renders one adjustment handle for every resize direction", () => {
    const markup = getAreaResizeHandlesMarkup()

    expect(markup.match(/data-handle=/g)).toHaveLength(8)
    AREA_RESIZE_HANDLES.forEach((handle) => {
      expect(markup).toContain(`data-handle="${handle}"`)
    })
  })

  test("moves the selected area while keeping it inside the viewport", () => {
    expect(moveAreaRect(
      { x: 100, y: 80, width: 240, height: 120 },
      700,
      -200,
      { width: 800, height: 600 }
    )).toEqual({ x: 560, y: 0, width: 240, height: 120 })
  })

  test.each([
    ["nw", { x: 130, y: 120, width: 170, height: 100 }],
    ["n", { x: 100, y: 120, width: 200, height: 100 }],
    ["ne", { x: 100, y: 120, width: 230, height: 100 }],
    ["e", { x: 100, y: 100, width: 230, height: 120 }],
    ["se", { x: 100, y: 100, width: 230, height: 140 }],
    ["s", { x: 100, y: 100, width: 200, height: 140 }],
    ["sw", { x: 130, y: 100, width: 170, height: 140 }],
    ["w", { x: 130, y: 100, width: 170, height: 120 }]
  ] as const)("resizes the selected area from the %s handle", (handle, expected) => {
    expect(resizeAreaRect(
      { x: 100, y: 100, width: 200, height: 120 },
      handle,
      30,
      20,
      { width: 800, height: 600 }
    )).toEqual(expected)
  })

  test("keeps resized areas inside the viewport", () => {
    expect(resizeAreaRect(
      { x: 100, y: 100, width: 200, height: 120 },
      "nw",
      -300,
      -300,
      { width: 800, height: 600 }
    )).toEqual({ x: 0, y: 0, width: 300, height: 220 })

    expect(resizeAreaRect(
      { x: 650, y: 500, width: 100, height: 60 },
      "se",
      300,
      300,
      { width: 800, height: 600 }
    )).toEqual({ x: 650, y: 500, width: 150, height: 100 })
  })

  test("enforces the minimum size without flipping resize handles", () => {
    expect(resizeAreaRect(
      { x: 100, y: 100, width: 200, height: 120 },
      "nw",
      500,
      500,
      { width: 800, height: 600 },
      20
    )).toEqual({ x: 280, y: 200, width: 20, height: 20 })
  })
})
