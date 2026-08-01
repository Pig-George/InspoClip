import { RuntimeFailure } from "../errors"

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

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

  constructor(baseUrl: string, fetchFn: FetchLike = fetch) {
    this.baseUrl = trimBase(baseUrl)
    this.fetchFn = fetchFn
  }

  buildUrl(path: string): string {
    const normalizedPath = String(path || "").replace(/^\/+/, "")
    return `${this.baseUrl}/${normalizedPath}`
  }

  async request<T = void>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await this.fetchFn(this.buildUrl(path), init)
    } catch {
      throw new RuntimeFailure({
        code: "NETWORK_ERROR",
        message: "Unable to reach the InspoClip backend",
        retryable: true,
        action: "retry"
      })
    }

    const body = await readJson(response)
    if (!response.ok) {
      const action = errorAction(response.status)
      throw new RuntimeFailure({
        code: `BACKEND_HTTP_${response.status}`,
        message: backendMessage(body, response.status),
        retryable: isRetryableStatus(response.status),
        ...(action ? { action } : {})
      })
    }

    return body as T
  }
}
