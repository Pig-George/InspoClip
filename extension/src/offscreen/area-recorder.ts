export type AreaRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ViewportSize = {
  width: number
  height: number
  clientWidth?: number
  clientHeight?: number
  visualWidth?: number
  visualHeight?: number
  visualOffsetLeft?: number
  visualOffsetTop?: number
  visualScale?: number
  captureInsetLeft?: number
  captureInsetTop?: number
  captureWidthPadding?: number
  captureHeightPadding?: number
}

export type RecordingCommand =
  | { type: "START_OFFSCREEN_AREA_RECORDING"; recordingId: string; streamId: string; rect: AreaRect; viewport: ViewportSize }
  | { type: "PAUSE_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "RESUME_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "STOP_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "CANCEL_OFFSCREEN_AREA_RECORDING"; recordingId: string }

export type RecordingResult = {
  dataUrl: string
  mimeType: string
  size: number
}

export type TabCaptureMediaConstraints = {
  audio: false
  video: {
    mandatory: {
      chromeMediaSource: "tab"
      chromeMediaSourceId: string
    }
  }
}

export function getTabCaptureMediaConstraints(streamId: string): TabCaptureMediaConstraints {
  return {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    }
  }
}

type SourceSize = {
  width: number
  height: number
}

type CaptureCoordinateSpace = {
  width: number
  height: number
  widthScaleWidth: number
  heightScaleHeight: number
  offsetLeft: number
  offsetTop: number
}

type ActiveRecording = {
  recordingId: string
  sourceStream: MediaStream
  outputStream: MediaStream
  video: HTMLVideoElement
  recorder: MediaRecorder
  chunks: Blob[]
  frameTimerId: number
  mimeType: string
}

export function getPreferredRecordingMimeType(
  mediaRecorder: Pick<typeof MediaRecorder, "isTypeSupported"> | undefined
): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ]

  return candidates.find((type) => mediaRecorder?.isTypeSupported?.(type)) || ""
}

export function getRecordingUploadMimeType(recordingMimeType: string): string {
  const baseMimeType = recordingMimeType.split(";")[0]?.trim().toLowerCase()
  return baseMimeType || "video/webm"
}

export function getOffscreenRecordingFrameIntervalMs(fps: number): number {
  const safeFps = Number.isFinite(fps) ? Math.min(30, Math.max(1, Math.round(fps))) : 30
  return Math.round(1000 / safeFps)
}

function getPositiveNumber(value: unknown): number | undefined {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined
}

function getFiniteNumber(value: unknown): number | undefined {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getCaptureCoordinateSpace(viewport: ViewportSize): CaptureCoordinateSpace {
  const captureInsetLeft = getFiniteNumber(viewport.captureInsetLeft) ?? 0
  const captureInsetTop = getFiniteNumber(viewport.captureInsetTop) ?? 0
  const layoutWidth = getPositiveNumber(viewport.clientWidth) ?? getPositiveNumber(viewport.width) ?? 1
  const layoutHeight = getPositiveNumber(viewport.clientHeight) ?? getPositiveNumber(viewport.height) ?? 1
  const width = Math.max(1, layoutWidth + Math.max(0, captureInsetLeft) * 2)
  const height = Math.max(1, layoutHeight + Math.max(0, captureInsetTop) * 2)
  return {
    width,
    height,
    widthScaleWidth: Math.max(1, width + Math.max(0, getFiniteNumber(viewport.captureWidthPadding) ?? 0)),
    heightScaleHeight: Math.max(1, height + Math.max(0, getFiniteNumber(viewport.captureHeightPadding) ?? 0)),
    offsetLeft: (getFiniteNumber(viewport.visualOffsetLeft) ?? 0) + captureInsetLeft,
    offsetTop: (getFiniteNumber(viewport.visualOffsetTop) ?? 0) + captureInsetTop
  }
}

export function getAreaRecordingSourceRect(
  rect: AreaRect,
  source: SourceSize,
  viewport: ViewportSize
): AreaRect {
  const coordinateSpace = getCaptureCoordinateSpace(viewport)
  const scaleX = source.width / coordinateSpace.width
  const scaleY = source.height / coordinateSpace.height
  const widthScaleX = source.width / coordinateSpace.widthScaleWidth
  const heightScaleY = source.height / coordinateSpace.heightScaleHeight
  const sourceX = clamp(Math.round((rect.x + coordinateSpace.offsetLeft) * scaleX), 0, Math.max(0, source.width - 1))
  const sourceY = clamp(Math.round((rect.y + coordinateSpace.offsetTop) * scaleY), 0, Math.max(0, source.height - 1))
  const sourceWidth = Math.max(1, Math.round(rect.width * widthScaleX))
  const sourceHeight = Math.max(1, Math.round(rect.height * heightScaleY))

  return {
    x: sourceX,
    y: sourceY,
    width: Math.max(1, Math.min(sourceWidth, source.width - sourceX)),
    height: Math.max(1, Math.min(sourceHeight, source.height - sourceY))
  }
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady)
      video.removeEventListener("error", onError)
    }
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Failed to initialize tab recording stream"))
    }
    video.addEventListener("loadedmetadata", onReady, { once: true })
    video.addEventListener("error", onError, { once: true })
  })
}

function cleanupRecording(recording: ActiveRecording): void {
  clearInterval(recording.frameTimerId)
  recording.sourceStream.getTracks().forEach((track) => track.stop())
  recording.outputStream.getTracks().forEach((track) => track.stop())
  recording.video.pause()
  recording.video.srcObject = null
}

function stopMediaRecorder(recorder: MediaRecorder): Promise<void> {
  return new Promise((resolve) => {
    if (recorder.state === "inactive") {
      resolve()
      return
    }
    recorder.requestData()
    recorder.addEventListener("stop", () => resolve(), { once: true })
    recorder.stop()
  })
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Recording failed")
}

export class OffscreenAreaRecorder {
  private recordings = new Map<string, ActiveRecording>()

  async start(command: Extract<RecordingCommand, { type: "START_OFFSCREEN_AREA_RECORDING" }>): Promise<{ recordingId: string; width: number; height: number; mimeType: string }> {
    if (this.recordings.has(command.recordingId)) {
      throw new Error("Recording already exists")
    }

    const sourceStream = await navigator.mediaDevices.getUserMedia(
      getTabCaptureMediaConstraints(command.streamId) as unknown as MediaStreamConstraints
    )
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.srcObject = sourceStream
    await waitForVideoReady(video)
    await video.play()

    const sourceRect = getAreaRecordingSourceRect(
      command.rect,
      { width: video.videoWidth, height: video.videoHeight },
      command.viewport
    )
    const canvas = document.createElement("canvas")
    canvas.width = sourceRect.width
    canvas.height = sourceRect.height
    const context = canvas.getContext("2d")
    if (!context) {
      sourceStream.getTracks().forEach((track) => track.stop())
      throw new Error("Failed to create recording canvas")
    }

    const outputStream = canvas.captureStream(30)
    const canvasTrack = outputStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
    const mimeType = getPreferredRecordingMimeType(MediaRecorder)
    const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) chunks.push(event.data)
    })

    const recording: ActiveRecording = {
      recordingId: command.recordingId,
      sourceStream,
      outputStream,
      video,
      recorder,
      chunks,
      frameTimerId: 0,
      mimeType
    }
    this.recordings.set(command.recordingId, recording)

    const drawFrame = () => {
      if (!this.recordings.has(command.recordingId)) return
      if (recorder.state === "recording") {
        context.drawImage(
          video,
          sourceRect.x,
          sourceRect.y,
          sourceRect.width,
          sourceRect.height,
          0,
          0,
          canvas.width,
          canvas.height
        )
        canvasTrack?.requestFrame?.()
      }
    }

    recorder.start(1000)
    drawFrame()
    recording.frameTimerId = window.setInterval(drawFrame, getOffscreenRecordingFrameIntervalMs(30))

    return {
      recordingId: command.recordingId,
      width: canvas.width,
      height: canvas.height,
      mimeType: getRecordingUploadMimeType(mimeType)
    }
  }

  pause(recordingId: string): void {
    const recording = this.requireRecording(recordingId)
    if (recording.recorder.state === "recording") recording.recorder.pause()
  }

  resume(recordingId: string): void {
    const recording = this.requireRecording(recordingId)
    if (recording.recorder.state === "paused") recording.recorder.resume()
  }

  async stop(recordingId: string): Promise<RecordingResult> {
    const recording = this.requireRecording(recordingId)
    await stopMediaRecorder(recording.recorder)
    this.recordings.delete(recordingId)
    cleanupRecording(recording)
    const blob = new Blob(recording.chunks, { type: getRecordingUploadMimeType(recording.mimeType) })
    return encodeRecordingBlob(blob)
  }

  async cancel(recordingId: string): Promise<void> {
    const recording = this.recordings.get(recordingId)
    if (!recording) return
    await stopMediaRecorder(recording.recorder)
    this.recordings.delete(recordingId)
    cleanupRecording(recording)
  }

  async handle(command: RecordingCommand): Promise<unknown> {
    if (command.type === "START_OFFSCREEN_AREA_RECORDING") return this.start(command)
    if (command.type === "PAUSE_OFFSCREEN_AREA_RECORDING") {
      this.pause(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "RESUME_OFFSCREEN_AREA_RECORDING") {
      this.resume(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "STOP_OFFSCREEN_AREA_RECORDING") return this.stop(command.recordingId)
    if (command.type === "CANCEL_OFFSCREEN_AREA_RECORDING") {
      await this.cancel(command.recordingId)
      return { recordingId: command.recordingId }
    }
  }

  private requireRecording(recordingId: string): ActiveRecording {
    const recording = this.recordings.get(recordingId)
    if (!recording) throw new Error("Recording not found")
    return recording
  }
}

export function isRecordingCommand(value: unknown): value is RecordingCommand {
  return Boolean(value && typeof value === "object" && "type" in value && String((value as { type: unknown }).type).includes("_OFFSCREEN_AREA_RECORDING"))
}

export function createAreaRecorderMessageHandler(recorder = new OffscreenAreaRecorder()) {
  return (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void): boolean => {
    if (!isRecordingCommand(message)) return false
    recorder
      .handle(message)
      .then((result) => sendResponse({ success: true, ...(typeof result === "object" && result ? result : {}) }))
      .catch((error) => sendResponse({ success: false, error: normalizeError(error) }))
    return true
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Failed to encode recording"))
    reader.readAsDataURL(blob)
  })
}

export async function encodeRecordingBlob(blob: Blob): Promise<{ dataUrl: string; mimeType: string; size: number }> {
  return {
    dataUrl: await blobToDataUrl(blob),
    mimeType: blob.type || "video/webm",
    size: blob.size
  }
}
