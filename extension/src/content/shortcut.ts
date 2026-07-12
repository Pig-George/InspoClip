const MODIFIER_PARTS = ["ctrl", "alt", "shift", "meta"]

export type ShortcutEventLike = {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export function normalizePressedKey(key: string): string {
  const pressedKey = key.toLowerCase()
  if (pressedKey === " ") return "space"
  if (pressedKey === "arrowup") return "up"
  if (pressedKey === "arrowdown") return "down"
  if (pressedKey === "arrowleft") return "left"
  if (pressedKey === "arrowright") return "right"
  return pressedKey
}

export function matchShortcut(event: ShortcutEventLike, pattern?: string): boolean {
  if (!pattern) return false

  const parts = pattern.split("+").map((part) => part.trim().toLowerCase())
  const key = parts.find((part) => !MODIFIER_PARTS.includes(part))
  if (!key) return false

  return (
    normalizePressedKey(event.key) === key &&
    event.ctrlKey === parts.includes("ctrl") &&
    event.altKey === parts.includes("alt") &&
    event.shiftKey === parts.includes("shift") &&
    event.metaKey === parts.includes("meta")
  )
}
