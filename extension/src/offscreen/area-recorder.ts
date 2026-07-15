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
  captureBounds?: AreaRect
}

export type RecordingCommand =
  | { type: "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE"; sourceId: string; streamId: string }
  | { type: "RELEASE_OFFSCREEN_AREA_RECORDING_SOURCE"; sourceId: string }
  | { type: "START_OFFSCREEN_AREA_RECORDING"; recordingId: string; sourceId?: string; streamId?: string; rect: AreaRect; viewport: ViewportSize; includeTabAudio: boolean }
  | { type: "PAUSE_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "RESUME_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "PREPARE_RETAKE_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "START_RETAKE_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "RETAKE_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "STOP_OFFSCREEN_AREA_RECORDING"; recordingId: string }
  | { type: "CANCEL_OFFSCREEN_AREA_RECORDING"; recordingId: string }

export type RecordingResult = {
  dataUrl: string
  mimeType: string
  size: number
}

export type TabCaptureMediaConstraints = {
  audio: {
    mandatory: {
      chromeMediaSource: "tab"
      chromeMediaSourceId: string
    }
  }
  video: {
    mandatory: {
      chromeMediaSource: "tab"
      chromeMediaSourceId: string
    }
  }
}

export function getTabCaptureMediaConstraints(streamId: string): TabCaptureMediaConstraints {
  return {
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    }
  }
}

export function getAreaRecordingOutputTracks(
  canvasStream: Pick<MediaStream, "getVideoTracks">,
  sourceStream: Pick<MediaStream, "getAudioTracks">,
  includeTabAudio: boolean
): MediaStreamTrack[] {
  return [
    ...canvasStream.getVideoTracks(),
    ...(includeTabAudio ? sourceStream.getAudioTracks() : [])
  ]
}

type SourceSize = {
  width: number
  height: number
}

type CaptureCoordinateSpace = {
  x: number
  y: number
  width: number
  height: number
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
  audioContext?: AudioContext
}

type PreparedSource = {
  sourceId: string
  sourceStream: MediaStream
  video: HTMLVideoElement
  audioContext?: AudioContext
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
  const bounds = viewport.captureBounds

  return {
    x: getFiniteNumber(bounds?.x) ?? 0,
    y: getFiniteNumber(bounds?.y) ?? 0,
    width: getPositiveNumber(bounds?.width) ?? getPositiveNumber(viewport.width) ?? 1,
    height: getPositiveNumber(bounds?.height) ?? getPositiveNumber(viewport.height) ?? 1
  }
}

export function getAreaRecordingSourceRect(
  rect: AreaRect,
  source: SourceSize,
  viewport: ViewportSize
): AreaRect {
  const coordinateSpace = getCaptureCoordinateSpace(viewport)
  const scale = Math.min(
    source.width / coordinateSpace.width,
    source.height / coordinateSpace.height
  )
  const capturedWidth = coordinateSpace.width * scale
  const capturedHeight = coordinateSpace.height * scale
  const capturedX = (source.width - capturedWidth) / 2
  const capturedY = (source.height - capturedHeight) / 2
  const sourceX = clamp(
    Math.round(capturedX + (rect.x - coordinateSpace.x) * scale),
    0,
    Math.max(0, source.width - 1)
  )
  const sourceY = clamp(
    Math.round(capturedY + (rect.y - coordinateSpace.y) * scale),
    0,
    Math.max(0, source.height - 1)
  )
  const sourceWidth = Math.max(1, Math.round(rect.width * scale))
  const sourceHeight = Math.max(1, Math.round(rect.height * scale))

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
  void recording.audioContext?.close().catch(() => undefined)
}

function cleanupPreparedSource(source: PreparedSource): void {
  source.sourceStream.getTracks().forEach((track) => track.stop())
  source.video.pause()
  source.video.srcObject = null
  void source.audioContext?.close().catch(() => undefined)
}

function createTabAudioMonitor(sourceStream: MediaStream): AudioContext | undefined {
  if (!sourceStream.getAudioTracks().length) return undefined
  const audioContext = new AudioContext()
  audioContext.createMediaStreamSource(sourceStream).connect(audioContext.destination)
  void audioContext.resume().catch(() => undefined)
  return audioContext
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

type AreaRecordingMediaRecorderState = {
  recorder: MediaRecorder
  outputStream: MediaStream
  mimeType: string
  chunks: Blob[]
}

type MediaRecorderFactory = (stream: MediaStream, options?: MediaRecorderOptions) => MediaRecorder

function createAreaRecordingMediaRecorder(
  outputStream: MediaStream,
  mimeType: string,
  createRecorder: MediaRecorderFactory = (stream, options) => new MediaRecorder(stream, options),
  startImmediately = true
): AreaRecordingMediaRecorderState {
  const recorder = createRecorder(outputStream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data?.size) chunks.push(event.data)
  })
  if (startImmediately) recorder.start(1000)
  return { recorder, outputStream, mimeType, chunks }
}

export async function prepareAreaRecordingMediaRecorderRetake(
  recording: AreaRecordingMediaRecorderState,
  createRecorder?: MediaRecorderFactory
): Promise<AreaRecordingMediaRecorderState> {
  await stopMediaRecorder(recording.recorder)
  return createAreaRecordingMediaRecorder(
    recording.outputStream,
    recording.mimeType,
    createRecorder,
    false
  )
}

export function startPreparedAreaRecordingMediaRecorder(
  recording: AreaRecordingMediaRecorderState
): AreaRecordingMediaRecorderState {
  if (recording.recorder.state !== "inactive") {
    throw new Error("Retake recorder is not ready to start")
  }
  recording.recorder.start(1000)
  return recording
}

export async function restartAreaRecordingMediaRecorder(
  recording: AreaRecordingMediaRecorderState,
  createRecorder?: MediaRecorderFactory
): Promise<AreaRecordingMediaRecorderState> {
  const prepared = await prepareAreaRecordingMediaRecorderRetake(recording, createRecorder)
  return startPreparedAreaRecordingMediaRecorder(prepared)
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Recording failed")
}

export class OffscreenAreaRecorder {
  private recordings = new Map<string, ActiveRecording>()
  private preparedSources = new Map<string, PreparedSource>()

  async prepare(command: Extract<RecordingCommand, { type: "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE" }>): Promise<{ sourceId: string }> {
    const existing = this.preparedSources.get(command.sourceId)
    if (existing) cleanupPreparedSource(existing)

    const sourceStream = await navigator.mediaDevices.getUserMedia(
      getTabCaptureMediaConstraints(command.streamId) as unknown as MediaStreamConstraints
    )
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.srcObject = sourceStream
    await waitForVideoReady(video)
    await video.play()
    const audioContext = createTabAudioMonitor(sourceStream)

    this.preparedSources.set(command.sourceId, {
      sourceId: command.sourceId,
      sourceStream,
      video,
      audioContext
    })

    return { sourceId: command.sourceId }
  }

  release(sourceId: string): void {
    const source = this.preparedSources.get(sourceId)
    if (!source) return
    this.preparedSources.delete(sourceId)
    cleanupPreparedSource(source)
  }

  async start(command: Extract<RecordingCommand, { type: "START_OFFSCREEN_AREA_RECORDING" }>): Promise<{ recordingId: string; width: number; height: number; mimeType: string }> {
    if (this.recordings.has(command.recordingId)) {
      throw new Error("Recording already exists")
    }

    const preparedSource = command.sourceId ? this.preparedSources.get(command.sourceId) : undefined
    if (command.sourceId && !preparedSource) {
      throw new Error("Prepared recording source expired. Please start area capture again.")
    }
    if (!preparedSource && !command.streamId) {
      throw new Error("Missing tab capture stream for recording")
    }
    const sourceStream = preparedSource?.sourceStream || await navigator.mediaDevices.getUserMedia(
      getTabCaptureMediaConstraints(command.streamId) as unknown as MediaStreamConstraints
    )
    const video = preparedSource?.video || document.createElement("video")
    if (!preparedSource) {
      video.muted = true
      video.playsInline = true
      video.srcObject = sourceStream
      await waitForVideoReady(video)
      await video.play()
    } else {
      this.preparedSources.delete(preparedSource.sourceId)
    }

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

    const canvasStream = canvas.captureStream(30)
    const outputStream = new MediaStream(getAreaRecordingOutputTracks(canvasStream, sourceStream, Boolean(command.includeTabAudio)))
    const canvasTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
    const mimeType = getPreferredRecordingMimeType(MediaRecorder)
    const recorderState = createAreaRecordingMediaRecorder(outputStream, mimeType)

    const recording: ActiveRecording = {
      recordingId: command.recordingId,
      sourceStream,
      outputStream,
      video,
      recorder: recorderState.recorder,
      chunks: recorderState.chunks,
      frameTimerId: 0,
      mimeType,
      audioContext: preparedSource?.audioContext || createTabAudioMonitor(sourceStream)
    }
    this.recordings.set(command.recordingId, recording)

    const drawFrame = () => {
      if (!this.recordings.has(command.recordingId)) return
      if (recording.recorder.state === "recording") {
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

  async retake(recordingId: string): Promise<void> {
    await this.prepareRetake(recordingId)
    this.startRetake(recordingId)
  }

  async prepareRetake(recordingId: string): Promise<void> {
    const recording = this.requireRecording(recordingId)
    const prepared = await prepareAreaRecordingMediaRecorderRetake(recording)
    recording.recorder = prepared.recorder
    recording.chunks = prepared.chunks
  }

  startRetake(recordingId: string): void {
    const recording = this.requireRecording(recordingId)
    startPreparedAreaRecordingMediaRecorder(recording)
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
    if (command.type === "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE") return this.prepare(command)
    if (command.type === "RELEASE_OFFSCREEN_AREA_RECORDING_SOURCE") {
      this.release(command.sourceId)
      return { sourceId: command.sourceId }
    }
    if (command.type === "START_OFFSCREEN_AREA_RECORDING") return this.start(command)
    if (command.type === "PAUSE_OFFSCREEN_AREA_RECORDING") {
      this.pause(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "RESUME_OFFSCREEN_AREA_RECORDING") {
      this.resume(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "PREPARE_RETAKE_OFFSCREEN_AREA_RECORDING") {
      await this.prepareRetake(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "START_RETAKE_OFFSCREEN_AREA_RECORDING") {
      this.startRetake(command.recordingId)
      return { recordingId: command.recordingId }
    }
    if (command.type === "RETAKE_OFFSCREEN_AREA_RECORDING") {
      await this.retake(command.recordingId)
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
