import { describe, expect, test } from "vitest"

import {
  AREA_RESIZE_HANDLES,
  formatRecordingDuration,
  getAreaRecordingInnerRect,
  getAreaRecordingSourceRect,
  getAreaCaptureToolbarPosition,
  getPreferredRecordingMimeType,
  getRecordingUploadMimeType,
  moveAreaRect,
  resizeAreaRect
} from "./area-recording"

describe("area recording helpers", () => {
  test("places the toolbar below the selected area when there is enough room", () => {
    const position = getAreaCaptureToolbarPosition(
      { x: 100, y: 120, width: 240, height: 120 },
      { width: 800, height: 600 },
      { width: 260, height: 44 }
    )

    expect(position.placement).toBe("bottom")
    expect(position.top).toBe(252)
    expect(position.left).toBe(90)
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
