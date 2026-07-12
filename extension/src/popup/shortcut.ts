const MODIFIER_KEYS = ["Control", "Shift", "Alt", "Meta"]

export type ShortcutKeyboardEvent = {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export function isModifierOnlyKey(key: string): boolean {
  return MODIFIER_KEYS.includes(key)
}

export function normalizeShortcutKey(key: string): string {
  if (key === " ") return "Space"
  if (key === "ArrowUp") return "Up"
  if (key === "ArrowDown") return "Down"
  if (key === "ArrowLeft") return "Left"
  if (key === "ArrowRight") return "Right"
  return key.length === 1 ? key.toUpperCase() : key
}

export function formatShortcut(event: ShortcutKeyboardEvent): string | null {
  if (isModifierOnlyKey(event.key)) return null

  const parts: string[] = []
  if (event.ctrlKey) parts.push("Ctrl")
  if (event.altKey) parts.push("Alt")
  if (event.shiftKey) parts.push("Shift")
  if (event.metaKey) parts.push("Meta")

  parts.push(normalizeShortcutKey(event.key))
  return parts.join("+")
}
