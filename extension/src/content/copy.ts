export type ContentLocale = "en" | "zh"
export type CopyButtonState = "idle" | "copied"

export function getCopyButtonLabel(locale: ContentLocale, state: CopyButtonState = "idle"): string {
  if (locale === "zh") return state === "copied" ? "已复制" : "复制"
  return state === "copied" ? "Copied" : "Copy"
}
