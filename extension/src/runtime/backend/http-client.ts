import { RuntimeFailure } from "../errors"
export type BackendRequestFailureDiagnostic = {
  url: string
  method: string
  error: unknown
  context?: Record<string, unknown>
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type BackendHttpClientOptions = {
  allowLoopbackFallback?: boolean
  onRequestFailure?: (diagnostic: BackendRequestFailureDiagnostic) => void | Promise<void>
}

function trimBase(url: string): string {
  return String(url || "").trim().replace(/\/+$/, "")
}

function errorAction(status: number): "open-settings" | "retry" | undefined {
  if (status === 401 || status === 403) return "open-settings"
  if (status === 408 || status === 429 || status >= 500) return "retry"
  return undefined
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers?.get?.("content-length") === "0") return undefined
  const contentType = response.headers?.get?.("content-type") || ""
  if (!response.headers && typeof response.json === "function") return response.json().catch(() => undefined)
  if (!contentType.toLowerCase().includes("json")) return undefined
  return response.json().catch(() => undefined)
}

function backendMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string" && body.error.trim()) return body.error
    if ("message" in body && typeof body.message === "string" && body.message.trim()) return body.message
  }
  return `Backend request failed with HTTP ${status}`
}

export class BackendHttpClient {
  readonly baseUrl: string
  private readonly fetchFn: FetchLike
  private readonly allowLoopbackFallback: boolean
  private readonly onRequestFailure?: (diagnostic: BackendRequestFailureDiagnostic) => void | Promise<void>

  constructor(baseUrl: string, fetchFn: FetchLike = fetch, options: BackendHttpClientOptions = {}) {
    this.baseUrl = trimBase(baseUrl)
    this.fetchFn = fetchFn
    this.allowLoopbackFallback = options.allowLoopbackFallback === true
    this.onRequestFailure = options.onRequestFailure
  }

  buildUrl(path: string): string {
    const normalizedPath = String(path || "").replace(/^\/+/, "")
    return `${this.baseUrl}/${normalizedPath}`
  }

  async request<T = void>(path: string, init?: RequestInit): Promise<T> {
    let response: Response | undefined
    const urls = this.allowLoopbackFallback ? requestUrls(this.baseUrl, path) : [this.buildUrl(path)]
    for (const url of urls) {
      try {
        response = await this.fetchFn.call(globalThis, url, init)
        break
      } catch (error) {
        try {
          await this.onRequestFailure?.({ url, method: init?.method || "GET", error })
        } catch (diagnosticError) {
          console.warn("[InspoClip] Failed to persist backend diagnostics", diagnosticError)
        }
        console.warn("[InspoClip] Backend request attempt failed", {
          url,
          method: init?.method || "GET",
          error
        })
        // Retry localhost through IPv4 below; do not expose provider/network details to the UI.
      }
    }
    if (!response) {
      console.error("[InspoClip] Unable to reach backend after all attempts", {
        baseUrl: this.baseUrl,
        path,
        method: init?.method || "GET",
        attemptedUrls: urls
      })
      throw new RuntimeFailure({
        code: "NETWORK_ERROR",
        message: "Unable to reach the InspoClip backend",
        retryable: true,
        action: "retry"
      })
    }

    const body = await readJson(response)
    if (!response.ok) {
      const message = backendMessage(body, response.status)
      try {
        await this.onRequestFailure?.({
          url: this.buildUrl(path),
          method: init?.method || "GET",
          error: new Error(message),
          context: { status: response.status }
        })
      } catch (diagnosticError) {
        console.warn("[InspoClip] Failed to persist backend diagnostics", diagnosticError)
      }
      const action = errorAction(response.status)
      throw new RuntimeFailure({
        code: `BACKEND_HTTP_${response.status}`,
        message,
        retryable: isRetryableStatus(response.status),
        ...(action ? { action } : {})
      })
    }

    return body as T
  }
}

function requestUrls(baseUrl: string, path: string): string[] {
  const primary = `${baseUrl}/${String(path || "").replace(/^\/+/, "")}`
  try {
    const url = new URL(baseUrl)
    if (url.hostname !== "localhost") return [primary]
    url.hostname = "127.0.0.1"
    const fallbackBase = url.toString().replace(/\/$/, "")
    return [primary, `${fallbackBase}/${String(path || "").replace(/^\/+/, "")}`]
  } catch {
    return [primary]
  }
}
