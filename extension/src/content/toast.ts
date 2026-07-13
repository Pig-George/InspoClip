export type ToastType = "loading" | "success" | "error" | string

type ToastElementLike = {
  className: string
  dataset: Record<string, string>
  querySelector: (selector: string) => { innerHTML?: string; textContent?: string | null } | null
}

export function getToastIconMarkup(type: ToastType): string {
  if (type === "loading") return '<div class="inspoclip-spinner"></div>'
  if (type === "error") return "✗"
  return "✓"
}

export function syncToastElement(toast: ToastElementLike, message: string, type: ToastType): void {
  toast.className = `inspoclip-toast inspoclip-toast-${type}`
  toast.dataset.type = type

  const icon = toast.querySelector(".inspoclip-toast-icon")
  if (icon) icon.innerHTML = getToastIconMarkup(type)

  const text = toast.querySelector(".inspoclip-toast-text")
  if (text) text.textContent = message
}
