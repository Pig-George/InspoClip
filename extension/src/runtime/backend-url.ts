export const DEFAULT_BACKEND_URL = "http://127.0.0.1:3001"

export function normalizeBackendUrl(value: string | undefined | null): string {
  const trimmed = String(value || "").trim().replace(/\/+$/, "")
  if (!trimmed) return DEFAULT_BACKEND_URL

  try {
    const url = new URL(trimmed)
    if (url.hostname === "localhost" && url.port === "3001") {
      url.hostname = "127.0.0.1"
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return trimmed
  }
}
