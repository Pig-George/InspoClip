export type ContentLocale = "en" | "zh"
export type CopyButtonState = "idle" | "copied"

export function getCopyButtonTitle(locale: ContentLocale, state: CopyButtonState = "idle"): string {
  if (locale === "zh") return state === "copied" ? "已复制" : "复制"
  return state === "copied" ? "Copied" : "Copy"
}

export function getCopyButtonIcon(state: CopyButtonState = "idle"): string {
  if (state === "copied") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M13.5 4.5 6.5 11.5 3 8" />
      </svg>
    `
  }

  return `
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="5" y="3" width="8" height="10" rx="1.5" />
      <path d="M3 6.5V12a2 2 0 0 0 2 2h5.5" />
    </svg>
  `
}
