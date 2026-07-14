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

export const AREA_RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const

export type AreaResizeHandle = typeof AREA_RESIZE_HANDLES[number]

export function getAreaResizeHandlesMarkup(): string {
  return AREA_RESIZE_HANDLES
    .map((handle) => `<span class="inspoclip-area-handle" data-handle="${handle}" aria-hidden="true"></span>`)
    .join("")
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function moveAreaRect(
  rect: AreaRect,
  deltaX: number,
  deltaY: number,
  viewport: ViewportSize
): AreaRect {
  return {
    ...rect,
    x: clamp(rect.x + deltaX, 0, Math.max(0, viewport.width - rect.width)),
    y: clamp(rect.y + deltaY, 0, Math.max(0, viewport.height - rect.height))
  }
}

export function resizeAreaRect(
  rect: AreaRect,
  handle: AreaResizeHandle,
  deltaX: number,
  deltaY: number,
  viewport: ViewportSize,
  minSize = 20
): AreaRect {
  const minimumWidth = Math.min(Math.max(1, minSize), Math.max(1, viewport.width))
  const minimumHeight = Math.min(Math.max(1, minSize), Math.max(1, viewport.height))
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.width
  let bottom = rect.y + rect.height

  if (handle.includes("w")) {
    left = clamp(rect.x + deltaX, 0, right - minimumWidth)
  } else if (handle.includes("e")) {
    right = clamp(right + deltaX, left + minimumWidth, viewport.width)
  }

  if (handle.includes("n")) {
    top = clamp(rect.y + deltaY, 0, bottom - minimumHeight)
  } else if (handle.includes("s")) {
    bottom = clamp(bottom + deltaY, top + minimumHeight, viewport.height)
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  }
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

export function getAreaRecordingInnerRect(rect: AreaRect, inset = 2): AreaRect {
  const safeInset = Math.max(0, Math.min(inset, Math.floor((Math.min(rect.width, rect.height) - 1) / 2)))

  return {
    x: rect.x + safeInset,
    y: rect.y + safeInset,
    width: Math.max(1, rect.width - safeInset * 2),
    height: Math.max(1, rect.height - safeInset * 2)
  }
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
