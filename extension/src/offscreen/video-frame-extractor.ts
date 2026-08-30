import type { VideoFrame, VideoFrameExtractionResult } from "../runtime/local/video-frames"

export type VideoFrameExtractionCommand = {
  type: "EXTRACT_OFFSCREEN_VIDEO_FRAMES"
  dataUrl: string
  frameCount: number
  durationSeconds?: number
}

export function createVideoSampleTimes(duration: number, requestedFrameCount: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const frameCount = Math.min(48, Math.max(4, Math.round(requestedFrameCount || 16)))
  const lastFrameTime = Math.max(0, duration - 0.05)
  return Array.from({ length: frameCount }, (_, index) => {
    if (index === frameCount - 1) return roundTimestamp(lastFrameTime)
    return roundTimestamp(duration * index / (frameCount - 1))
  })
}

export async function extractVideoFramesFromDataUrl(dataUrl: string, frameCount: number, expectedDurationSeconds?: number): Promise<VideoFrameExtractionResult> {
  const blob = await fetch(dataUrl).then((response) => response.blob())
  const objectUrl = URL.createObjectURL(blob)
  const video = document.createElement("video")
  video.preload = "auto"
  video.muted = true
  video.playsInline = true
  video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none"
  document.body.appendChild(video)

  try {
    video.src = objectUrl
    await waitForEvent(video, "loadedmetadata", "Video metadata could not be decoded")
    const duration = resolveVideoDuration(video.duration, expectedDurationSeconds, getSeekableDuration(video))
    if (duration === null) throw new Error("Video must have a valid duration")
    const canvas = document.createElement("canvas")
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) throw new Error("Video frame canvas is unavailable")

    const frames: VideoFrame[] = []
    for (const timestamp of createVideoSampleTimes(duration, frameCount)) {
      await seekVideo(video, timestamp)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.82), timestamp })
    }
    return { duration, frames }
  } finally {
    video.removeAttribute("src")
    video.load()
    video.remove()
    URL.revokeObjectURL(objectUrl)
  }
}

export function createVideoFrameExtractorMessageHandler() {
  return (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void): true | undefined => {
    const command = message as Partial<VideoFrameExtractionCommand> | null
    if (command?.type !== "EXTRACT_OFFSCREEN_VIDEO_FRAMES" || typeof command.dataUrl !== "string") return undefined
    extractVideoFramesFromDataUrl(command.dataUrl, Number(command.frameCount), Number(command.durationSeconds))
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error instanceof Error ? error.message : "Video frame extraction failed" }))
    return true
  }
}

export function resolveVideoDuration(
  metadataDuration: number,
  expectedDuration?: number,
  seekableDuration?: number
): number | null {
  if (Number.isFinite(metadataDuration) && metadataDuration > 0) return metadataDuration
  if (Number.isFinite(seekableDuration) && seekableDuration > 0) return seekableDuration
  if (Number.isFinite(expectedDuration) && expectedDuration > 0) return expectedDuration
  return null
}

function getSeekableDuration(video: HTMLVideoElement): number | undefined {
  try {
    if (!video.seekable.length) return undefined
    return video.seekable.end(video.seekable.length - 1)
  } catch {
    return undefined
  }
}

function seekVideo(video: HTMLVideoElement, timestamp: number): Promise<void> {
  if (Math.abs(video.currentTime - timestamp) < 0.001 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve()
  const ready = waitForEvent(video, "seeked", `Unable to decode video frame at ${timestamp.toFixed(3)}s`)
  video.currentTime = timestamp
  return ready
}

function waitForEvent(target: HTMLMediaElement, eventName: string, errorMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error(errorMessage)), 15_000)
    const onSuccess = () => finish()
    const onError = () => finish(new Error(errorMessage))
    const finish = (error?: Error) => {
      window.clearTimeout(timeout)
      target.removeEventListener(eventName, onSuccess)
      target.removeEventListener("error", onError)
      if (error) reject(error)
      else resolve()
    }
    target.addEventListener(eventName, onSuccess, { once: true })
    target.addEventListener("error", onError, { once: true })
  })
}

function roundTimestamp(value: number): number {
  return Math.round(value * 1000) / 1000
}
