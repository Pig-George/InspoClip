export type PromptLanguageMode = "auto" | "en" | "zh" | "both"

export type LocalizedPrompt = {
  en?: string
  zh?: string
}

type PromptRegenerationButton = {
  disabled: boolean
  classList: { add(name: string): void; remove(name: string): void }
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
}

export function applyPromptRegenerationButtonState(
  button: PromptRegenerationButton,
  active: boolean,
  locale: "en" | "zh"
): void {
  const label = active
    ? (locale === "zh" ? "正在重新生成 Prompt" : "Regenerating Prompt")
    : (locale === "zh" ? "重新生成" : "Regenerate")

  button.disabled = active
  button.classList[active ? "add" : "remove"]("is-loading")
  button.setAttribute("title", label)
  button.setAttribute("aria-label", label)
  if (active) button.setAttribute("aria-busy", "true")
  else button.removeAttribute("aria-busy")
}

export function createPromptRegenerationTracker<T extends object>() {
  const inFlight = new WeakMap<T, Promise<unknown>>()

  return {
    isActive(entry: T): boolean {
      return inFlight.has(entry)
    },
    start<TResult>(entry: T, request: Promise<TResult>): Promise<TResult> {
      const tracked = request.finally(() => {
        if (inFlight.get(entry) === tracked) inFlight.delete(entry)
      })
      inFlight.set(entry, tracked)
      return tracked
    }
  }
}

export function extractPromptFromImageAnalysis(value: unknown): LocalizedPrompt | null {
  if (!value || typeof value !== "object" || !("prompt" in value)) return null
  const prompt = value.prompt
  if (!prompt || typeof prompt !== "object") return null
  const localized = prompt as Record<string, unknown>
  const en = typeof localized.en === "string" ? localized.en.trim() : ""
  const zh = typeof localized.zh === "string" ? localized.zh.trim() : ""
  return en || zh ? { en, zh } : null
}

export function getPromptText(prompt: LocalizedPrompt | null | undefined, promptLangMode: PromptLanguageMode, locale: "en" | "zh"): string {
  if (!prompt || (!prompt.en && !prompt.zh)) return ""

  const effective = promptLangMode === "auto" ? locale : promptLangMode
  if (effective === "en") return prompt.en || prompt.zh || ""
  if (effective === "zh") return prompt.zh || prompt.en || ""
  return [prompt.en, prompt.zh].filter(Boolean).join("\n\n")
}
