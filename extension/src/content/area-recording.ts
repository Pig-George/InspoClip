export type AreaRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ViewportSize = {
  width: number
  height: number
}

export type ToolbarSize = {
  width: number
  height: number
}

export type SourceSize = {
  width: number
  height: number
}

export function getAreaCaptureToolbarPosition(
  rect: AreaRect,
  viewport: ViewportSize,
  toolbar: ToolbarSize,
  margin = 12
): { left: number; top: number; placement: "top" | "bottom" } {
  const centeredLeft = rect.x + rect.width / 2 - toolbar.width / 2
  const maxLeft = Math.max(margin, viewport.width - toolbar.width - margin)
  const left = Math.min(Math.max(margin, centeredLeft), maxLeft)

  const bottomTop = rect.y + rect.height + margin
  if (bottomTop + toolbar.height <= viewport.height - margin) {
    return { left, top: bottomTop, placement: "bottom" }
  }

  return {
    left,
    top: Math.max(margin, rect.y - toolbar.height - margin),
    placement: "top"
  }
}

export function formatRecordingDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
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

export function getAreaRecordingSourceRect(
  rect: AreaRect,
  source: SourceSize,
  viewport: ViewportSize
): AreaRect {
  const scaleX = source.width / viewport.width
  const scaleY = source.height / viewport.height
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.max(1, Math.round(rect.width * scaleX)),
    height: Math.max(1, Math.round(rect.height * scaleY))
  }
}
