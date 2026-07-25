import { getAreaToolbarIconMarkup, type AreaToolbarAction } from "./area-toolbar-icons"

export type { AreaToolbarAction } from "./area-toolbar-icons"

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
export const AREA_RECORDING_DELAY_OPTIONS = [0, 3, 5] as const
export type AreaRecordingDelaySeconds = typeof AREA_RECORDING_DELAY_OPTIONS[number]
export const DEFAULT_AREA_RECORDING_DELAY_SECONDS: AreaRecordingDelaySeconds = 3

type AreaToolbarLocale = "zh" | "en"

const AREA_TOOLBAR_LABELS: Record<AreaToolbarAction, Record<AreaToolbarLocale, string>> = {
  delay: { zh: "录屏延时", en: "Recording delay" },
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

const AREA_TOOLBAR_SHORT_LABELS: Record<AreaToolbarAction, Record<AreaToolbarLocale, string>> = {
  delay: { zh: "延时", en: "Delay" },
  screenshot: { zh: "截图", en: "Shot" },
  record: { zh: "录屏", en: "Record" },
  "sound-on": { zh: "声音", en: "Sound" },
  "sound-off": { zh: "声音", en: "Sound" },
  cancel: { zh: "取消", en: "Close" },
  pause: { zh: "暂停", en: "Pause" },
  resume: { zh: "继续", en: "Play" },
  retake: { zh: "重录", en: "Redo" },
  "confirm-retake": { zh: "确认", en: "Sure" },
  finish: { zh: "完成", en: "Done" }
}

const AREA_RECORDING_CONTROL_ACTIONS = ["pause", "retake", "finish", "cancel"] as const
const AREA_TOOLBAR_BUTTON_ENTRANCE_STAGGER_MS = 55

export function getAreaRecordingControlActions(): Array<typeof AREA_RECORDING_CONTROL_ACTIONS[number]> {
  return [...AREA_RECORDING_CONTROL_ACTIONS]
}

export function getAreaToolbarButtonEntranceDelay(index: number): number {
  const normalizedIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0
  return normalizedIndex * AREA_TOOLBAR_BUTTON_ENTRANCE_STAGGER_MS
}

export function isExtensionRuntimeAvailable(runtime: { id?: string } | null | undefined): boolean {
  return Boolean(runtime?.id)
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  return /extension context invalidated/i.test(message)
}

export function getExtensionContextRecoveryMessage(locale: AreaToolbarLocale): string {
  return locale === "zh"
    ? "扩展已更新，请刷新当前页面后重试"
    : "The extension was updated. Refresh this page and try again."
}

export function getAreaToolbarActionLabel(action: AreaToolbarAction, locale: AreaToolbarLocale): string {
  return AREA_TOOLBAR_LABELS[action][locale]
}

export function getAreaToolbarActionShortLabel(action: AreaToolbarAction, locale: AreaToolbarLocale): string {
  return AREA_TOOLBAR_SHORT_LABELS[action][locale]
}

export function getAreaToolbarActionIcon(action: AreaToolbarAction): string {
  return getAreaToolbarIconMarkup(action)
}

export function normalizeAreaRecordingDelay(value: unknown): AreaRecordingDelaySeconds {
  const numericValue = typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : value

  return AREA_RECORDING_DELAY_OPTIONS.includes(numericValue as AreaRecordingDelaySeconds)
    ? numericValue as AreaRecordingDelaySeconds
    : DEFAULT_AREA_RECORDING_DELAY_SECONDS
}

export function getNextAreaRecordingDelay(value: unknown): AreaRecordingDelaySeconds {
  const current = normalizeAreaRecordingDelay(value)
  const currentIndex = AREA_RECORDING_DELAY_OPTIONS.indexOf(current)
  return AREA_RECORDING_DELAY_OPTIONS[(currentIndex + 1) % AREA_RECORDING_DELAY_OPTIONS.length]
}

export function getAreaRecordingDelayLabel(
  value: unknown,
  locale: AreaToolbarLocale
): string {
  const delay = normalizeAreaRecordingDelay(value)
  if (locale === "zh") {
    return delay === 0
      ? "录屏延时：关闭"
      : `录屏延时：${delay} 秒`
  }
  return delay === 0 ? "Recording delay: off" : `Recording delay: ${delay} seconds`
}

export function getAreaRecordingDelayBadge(value: unknown): string {
  const delay = normalizeAreaRecordingDelay(value)
  return delay === 0 ? "OFF" : `${delay}s`
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
