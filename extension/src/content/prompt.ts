export type PromptLanguageMode = "auto" | "en" | "zh" | "both"

export type LocalizedPrompt = {
  en?: string
  zh?: string
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
