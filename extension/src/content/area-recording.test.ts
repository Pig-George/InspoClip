import { describe, expect, test } from "vitest"

import {
  formatRecordingDuration,
  getAreaRecordingSourceRect,
  getAreaCaptureToolbarPosition,
  getPreferredRecordingMimeType,
  getRecordingUploadMimeType
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
})
