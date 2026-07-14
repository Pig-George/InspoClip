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

export const DEFAULT_AREA_RECORDING_AUDIO_ENABLED = false

export type AreaToolbarAction =
  | "screenshot"
  | "record"
  | "sound-on"
  | "sound-off"
  | "cancel"
  | "pause"
  | "resume"
  | "retake"
  | "confirm-retake"
  | "finish"

type AreaToolbarLocale = "zh" | "en"

const AREA_TOOLBAR_LABELS: Record<AreaToolbarAction, Record<AreaToolbarLocale, string>> = {
  screenshot: { zh: "截图", en: "Screenshot" },
  record: { zh: "开始录屏", en: "Start recording" },
  "sound-on": { zh: "录制标签页声音：已开启", en: "Record tab audio: on" },
  "sound-off": { zh: "录制标签页声音：已关闭", en: "Record tab audio: off" },
  cancel: { zh: "取消", en: "Cancel" },
  pause: { zh: "暂停", en: "Pause" },
  resume: { zh: "继续", en: "Resume" },
  retake: { zh: "重录", en: "Retake" },
  "confirm-retake": { zh: "再次点击确认重录", en: "Click again to confirm retake" },
  finish: { zh: "完成并分析", en: "Finish and analyze" }
}

const AREA_TOOLBAR_ICON_PATHS: Record<AreaToolbarAction, string> = {
  screenshot: '<path d="M5 3H3v2M11 3h2v2M5 13H3v-2M11 13h2v-2"/><rect x="5" y="5" width="6" height="6" rx="1.5"/>',
  record: '<rect x="2.5" y="4" width="8" height="8" rx="2"/><path d="m10.5 7 3-1.5v5l-3-1.5z"/>',
  "sound-on": '<path d="M3 7v2h2l3 2.5v-7L5 7z"/><path d="M10.5 6a3 3 0 0 1 0 4M12 4.5a5 5 0 0 1 0 7"/>',
  "sound-off": '<path d="M3 7v2h2l3 2.5v-7L5 7z"/><path d="m10.5 6.5 3 3M13.5 6.5l-3 3"/>',
  cancel: '<path d="m4 4 8 8M12 4l-8 8"/>',
  pause: '<path d="M5.5 4v8M10.5 4v8"/>',
  resume: '<path d="m5 3.5 7 4.5-7 4.5z"/>',
  retake: '<path d="M4 5H1.8V2.8"/><path d="M2.2 5.2A6 6 0 1 1 2 10"/>',
  "confirm-retake": '<path d="M4 5H1.8V2.8"/><path d="M2.2 5.2A6 6 0 1 1 2 10"/>',
  finish: '<path d="m3.5 8 3 3 6-6"/>'
}

export function getAreaToolbarActionLabel(action: AreaToolbarAction, locale: AreaToolbarLocale): string {
  return AREA_TOOLBAR_LABELS[action][locale]
}

export function getAreaToolbarActionIcon(action: AreaToolbarAction): string {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${AREA_TOOLBAR_ICON_PATHS[action]}</svg>`
}

export type AreaRecordingTimerState = {
  startedAt: number
  pausedAt: number
  pausedTotal: number
}

export function createAreaRecordingTimerState(now = Date.now()): AreaRecordingTimerState {
  return {
    startedAt: now,
    pausedAt: 0,
    pausedTotal: 0
  }
}

export function createAreaRecordingStartMessage<TViewport extends ViewportSize>(options: {
  recordingId: string
  sourceId: string
  rect: AreaRect
  viewport: TViewport
  includeTabAudio: boolean
}) {
  return {
    type: "START_AREA_RECORDING" as const,
    ...options
  }
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
  const rightAlignedLeft = rect.x + rect.width - toolbar.width
  const maxLeft = Math.max(margin, viewport.width - toolbar.width - margin)
  const left = Math.min(Math.max(margin, rightAlignedLeft), maxLeft)

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
