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
