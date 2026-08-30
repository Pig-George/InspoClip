export type ToastType = "loading" | "success" | "error" | string

type ToastElementLike = {
  className: string
  dataset: Record<string, string>
  querySelector: (selector: string) => ToastChildLike | null
}

type ToastChildLike = {
  className?: string
  innerHTML?: string
  textContent?: string | null
  querySelector?: (selector: string) => ToastChildLike | null
  style?: {
    strokeDashoffset?: string
  }
}

export function getToastProgress(message: string): number | null {
  const matches = [...message.matchAll(/(\d+(?:\.\d+)?)\s*%/g)]
  if (!matches.length) return null

  const value = Number(matches[matches.length - 1][1])
  if (!Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

export function getToastProgressStrokeOffset(progress: number): number {
  const normalized = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : 0

  return 100 - normalized
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getVisibleToastMessage(message: string): string {
  return message.replace(/\s*\d+(?:\.\d+)?\s*%\s*$/u, "").trimEnd()
}

export function getToastTextMarkup(message: string, type: ToastType): string {
  const visibleMessage = getVisibleToastMessage(message)
  if (type !== "loading") return escapeHtml(visibleMessage)

  return Array.from(visibleMessage, (character, index) => {
    const content = character === " " ? "&nbsp;" : escapeHtml(character)
    return `<span class="inspoclip-toast-text-char" style="--inspoclip-toast-char-index: ${index}">${content}</span>`
  }).join("")
}

export function getToastIconMarkup(
  type: ToastType,
  message = "",
  explicitProgress: number | null = null
): string {
  if (type === "loading") {
    const progress = explicitProgress ?? getToastProgress(message)
    if (progress === null) {
      return `<svg class="inspoclip-progress-ring inspoclip-progress-ring-indeterminate" viewBox="0 0 20 20" aria-hidden="true">
        <circle class="inspoclip-progress-ring-track" cx="10" cy="10" r="8" pathLength="100"></circle>
        <circle class="inspoclip-progress-ring-value" cx="10" cy="10" r="8" pathLength="100"></circle>
      </svg>`
    }
    const strokeOffset = getToastProgressStrokeOffset(progress)
    return `<svg class="inspoclip-progress-ring inspoclip-progress-ring-determinate" viewBox="0 0 20 20" aria-hidden="true">
      <circle class="inspoclip-progress-ring-track" cx="10" cy="10" r="8" pathLength="100"></circle>
      <circle class="inspoclip-progress-ring-value" cx="10" cy="10" r="8" pathLength="100" style="stroke-dashoffset: ${strokeOffset}"></circle>
    </svg>`
  }
  if (type === "error") return "✗"
  return "✓"
}

export function syncToastElement(
  toast: ToastElementLike,
  message: string,
  type: ToastType,
  progress: number | null = null,
  preserveVisibility = false
): void {
  const previousType = toast.dataset.type
  const visibleMessage = getVisibleToastMessage(message)
  const isVisible = preserveVisibility && toast.className.split(/\s+/u).includes("inspoclip-toast-visible")
  toast.className = `inspoclip-toast inspoclip-toast-${type}${isVisible ? " inspoclip-toast-visible" : ""}`
  toast.dataset.type = type

  const icon = toast.querySelector(".inspoclip-toast-icon")
  if (icon) {
    const resolvedProgress = progress ?? getToastProgress(message)
    const existingProgressValue = previousType === "loading" && resolvedProgress !== null
      ? icon.querySelector?.(".inspoclip-progress-ring-determinate .inspoclip-progress-ring-value")
      : null

    if (existingProgressValue?.style) {
      existingProgressValue.style.strokeDashoffset = String(getToastProgressStrokeOffset(resolvedProgress))
    } else {
      icon.innerHTML = getToastIconMarkup(type, message, progress)
    }
  }

  const text = toast.querySelector(".inspoclip-toast-text")
  if (text && (previousType !== type || toast.dataset.message !== visibleMessage)) {
    if (type === "loading") text.innerHTML = getToastTextMarkup(message, type)
    else text.textContent = visibleMessage
  }
  toast.dataset.message = visibleMessage
}
