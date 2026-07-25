export type ToastType = "loading" | "success" | "error" | string

type ToastElementLike = {
  className: string
  dataset: Record<string, string>
  querySelector: (selector: string) => { innerHTML?: string; textContent?: string | null } | null
}

export function getToastProgress(message: string): number | null {
  const matches = [...message.matchAll(/(\d+(?:\.\d+)?)\s*%/g)]
  if (!matches.length) return null

  const value = Number(matches[matches.length - 1][1])
  if (!Number.isFinite(value)) return null
  return Math.min(100, Math.max(0, value))
}

export function getToastIconMarkup(type: ToastType, message = ""): string {
  if (type === "loading") {
    const progress = getToastProgress(message)
    if (progress === null) {
      return '<span class="inspoclip-progress-ring inspoclip-progress-ring-indeterminate" aria-hidden="true"></span>'
    }
    return `<span class="inspoclip-progress-ring inspoclip-progress-ring-determinate" style="--inspoclip-toast-progress: ${progress}" aria-hidden="true"></span>`
  }
  if (type === "error") return "✗"
  return "✓"
}

export function syncToastElement(toast: ToastElementLike, message: string, type: ToastType): void {
  toast.className = `inspoclip-toast inspoclip-toast-${type}`
  toast.dataset.type = type

  const icon = toast.querySelector(".inspoclip-toast-icon")
  if (icon) icon.innerHTML = getToastIconMarkup(type, message)

  const text = toast.querySelector(".inspoclip-toast-text")
  if (text) text.textContent = message
}
