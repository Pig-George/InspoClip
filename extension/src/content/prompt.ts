export type PromptLanguageMode = "auto" | "en" | "zh" | "both"

export type LocalizedPrompt = {
  en?: string
  zh?: string
}

export function getPromptText(prompt: LocalizedPrompt | null | undefined, promptLangMode: PromptLanguageMode, locale: "en" | "zh"): string {
  if (!prompt || (!prompt.en && !prompt.zh)) return ""

  const effective = promptLangMode === "auto" ? locale : promptLangMode
  if (effective === "en") return prompt.en || prompt.zh || ""
  if (effective === "zh") return prompt.zh || prompt.en || ""
  return [prompt.en, prompt.zh].filter(Boolean).join("\n\n")
}
