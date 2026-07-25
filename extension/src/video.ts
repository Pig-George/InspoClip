function trimBase(url: string): string {
  return String(url || "").replace(/\/+$/, "")
}

export function isSupportedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function buildClientVideoUrl(appUrl: string, videoId: string): string {
  const url = new URL(trimBase(appUrl) + "/")
  url.searchParams.set("video", videoId)
  return url.toString()
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${response.status}`
    throw new Error(error)
  }
  return body as T
}

function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false
  if (error instanceof TypeError) return true

  const name = error && typeof error === "object" && "name" in error
    ? String(error.name)
    : ""
  const message = error instanceof Error ? error.message : String(error || "")
  return name === "NetworkError"
    || /failed to fetch|network(?: error| changed)|load failed/i.test(message)
}

export async function uploadVideoBlob<T = unknown>(
  fetchFn: typeof fetch,
  serverUrl: string,
  blob: Blob,
  filename?: string,
  options?: { draft?: boolean }
): Promise<T> {
  const form = new FormData()
  form.append("video", blob, filename || "video.mp4")
  form.append("source", "extension")
  if (options?.draft) form.append("draft", "true")
  return responseJson<T>(await fetchFn(`${trimBase(serverUrl)}/api/videos`, { method: "POST", body: form }))
}

export async function uploadVideoUrl<T = unknown>(
  fetchFn: typeof fetch,
  serverUrl: string,
  videoUrl: string,
  options?: { draft?: boolean }
): Promise<T> {
  if (!isSupportedVideoUrl(videoUrl)) {
    throw new Error("Blob or protected video URLs must be downloaded and uploaded as a local file")
  }

  const response = await fetchFn(videoUrl)
  if (!response.ok) {
    throw new Error("Unable to download this video; save it locally and upload the file")
  }

  const blob = await response.blob()
  const name = new URL(videoUrl).pathname.split("/").pop() || "web-video.mp4"
  return uploadVideoBlob<T>(fetchFn, serverUrl, blob, name, options)
}

export async function pollVideoJob<T extends { status: string }>(
  fetchFn: typeof fetch,
  serverUrl: string,
  jobId: string,
  options?: {
    wait?: (ms: number) => Promise<void>
    intervalMs?: number
    maxNetworkRetries?: number
    retryBaseMs?: number
    retryMaxMs?: number
    onUpdate?: (job: T) => void
  }
): Promise<T> {
  const config = options || {}
  const wait = config.wait || ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const intervalMs = config.intervalMs === undefined ? 1500 : config.intervalMs
  const maxNetworkRetries = Math.max(0, Math.floor(config.maxNetworkRetries ?? 6))
  const retryBaseMs = Math.max(0, config.retryBaseMs ?? intervalMs)
  const retryMaxMs = Math.max(retryBaseMs, config.retryMaxMs ?? 5000)
  let successfulPolls = 0
  let consecutiveNetworkErrors = 0

  while (successfulPolls < 240) {
    let response: Response
    try {
      response = await fetchFn(`${trimBase(serverUrl)}/api/video-jobs/${jobId}`)
    } catch (error) {
      if (!isTransientNetworkError(error) || consecutiveNetworkErrors >= maxNetworkRetries) throw error

      const retryDelay = Math.min(retryMaxMs, retryBaseMs * 2 ** consecutiveNetworkErrors)
      consecutiveNetworkErrors += 1
      await wait(retryDelay)
      continue
    }

    consecutiveNetworkErrors = 0
    successfulPolls += 1
    const job = await responseJson<T>(response)
    if (config.onUpdate) config.onUpdate(job)
    if (job.status === "completed" || job.status === "failed") return job
    await wait(intervalMs)
  }

  throw new Error("Video analysis timed out")
}
