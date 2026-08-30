type RuntimeErrorLike = { code?: unknown }

export function shouldRecordRuntimeCommandFailure(commandType: string, error: RuntimeErrorLike, payload?: Record<string, unknown>): boolean {
  const code = String(error?.code || "")
  if (code === "LOCAL_CONTENT_URL_UNAVAILABLE") return false
  if (commandType === "runtime.prompt.generate" && code === "LOCAL_PROMPT_NOT_FOUND" && payload?.regenerate === false) return false
  return true
}
