import { describe, expect, test } from "vitest"

import {
  getAreaRecordingOutputTracks,
  getAreaRecordingSourceRect,
  getOffscreenRecordingFrameIntervalMs,
  getTabCaptureMediaConstraints,
  restartAreaRecordingMediaRecorder
} from "./area-recorder"

describe("offscreen area recorder helpers", () => {
  test("creates tab capture media constraints", () => {
    expect(getTabCaptureMediaConstraints("stream-1")).toEqual({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: "stream-1"
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: "stream-1"
        }
      }
    })
  })

  test("only includes the tab audio track when audio recording is enabled", () => {
    const videoTrack = { id: "cropped-video" } as MediaStreamTrack
    const audioTrack = { id: "tab-audio" } as MediaStreamTrack
    const canvasStream = {
      getVideoTracks: () => [videoTrack]
    } as Pick<MediaStream, "getVideoTracks">
    const sourceStream = {
      getAudioTracks: () => [audioTrack]
    } as Pick<MediaStream, "getAudioTracks">

    expect(getAreaRecordingOutputTracks(canvasStream, sourceStream, false)).toEqual([videoTrack])
    expect(getAreaRecordingOutputTracks(canvasStream, sourceStream, true)).toEqual([videoTrack, audioTrack])
  })

  test("restarts the media recorder on the existing output stream and discards old chunks", async () => {
    const calls: string[] = []
    const oldRecorder = {
      state: "recording",
      requestData: () => calls.push("old:requestData"),
      addEventListener: (type: string, listener: () => void) => {
        if (type === "stop") (oldRecorder as { onStop?: () => void }).onStop = listener
      },
      stop: () => {
        calls.push("old:stop")
        ;(oldRecorder as { onStop?: () => void }).onStop?.()
      }
    } as unknown as MediaRecorder
    const newRecorder = {
      state: "inactive",
      addEventListener: (type: string) => calls.push(`new:listen:${type}`),
      start: (timeslice: number) => calls.push(`new:start:${timeslice}`)
    } as unknown as MediaRecorder
    const outputStream = { id: "existing-output" } as unknown as MediaStream
    const oldChunks = [new Blob(["old take"])]

    const restarted = await restartAreaRecordingMediaRecorder(
      { recorder: oldRecorder, outputStream, mimeType: "video/webm", chunks: oldChunks },
      () => newRecorder
    )

    expect(calls).toEqual([
      "old:requestData",
      "old:stop",
      "new:listen:dataavailable",
      "new:start:1000"
    ])
    expect(restarted.recorder).toBe(newRecorder)
    expect(restarted.outputStream).toBe(outputStream)
    expect(restarted.chunks).toEqual([])
    expect(oldChunks).toHaveLength(1)
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
    )).toEqual({ x: 196, y: 52, width: 392, height: 196 })
  })

  test("uses explicit capture bounds as the single source of coordinate truth", () => {
    expect(getAreaRecordingSourceRect(
      { x: 100, y: 20, width: 200, height: 100 },
      { width: 1600, height: 1200 },
      {
        width: 817,
        height: 600,
        clientWidth: 800,
        clientHeight: 600,
        captureBounds: { x: 0, y: 0, width: 817, height: 600 }
      }
    )).toEqual({ x: 196, y: 52, width: 392, height: 196 })
  })

  test("maps through centered vertical letterboxing without stretching the y axis", () => {
    expect(getAreaRecordingSourceRect(
      { x: 100, y: 50, width: 200, height: 100 },
      { width: 1600, height: 1200 },
      {
        width: 800,
        height: 500,
        captureBounds: { x: 0, y: 0, width: 800, height: 500 }
      }
    )).toEqual({ x: 200, y: 200, width: 400, height: 200 })
  })

  test("maps through centered horizontal letterboxing without stretching the x axis", () => {
    expect(getAreaRecordingSourceRect(
      { x: 50, y: 100, width: 100, height: 200 },
      { width: 1200, height: 1600 },
      {
        width: 500,
        height: 800,
        captureBounds: { x: 0, y: 0, width: 500, height: 800 }
      }
    )).toEqual({ x: 200, y: 200, width: 200, height: 400 })
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
    )).toEqual({ x: 10, y: 20, width: 100, height: 80 })
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
