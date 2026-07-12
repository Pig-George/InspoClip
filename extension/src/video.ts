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

export async function uploadVideoBlob<T = unknown>(
  fetchFn: typeof fetch,
  serverUrl: string,
  blob: Blob,
  filename?: string
): Promise<T> {
  const form = new FormData()
  form.append("video", blob, filename || "video.mp4")
  form.append("source", "extension")
  return responseJson<T>(await fetchFn(`${trimBase(serverUrl)}/api/videos`, { method: "POST", body: form }))
}

export async function uploadVideoUrl<T = unknown>(fetchFn: typeof fetch, serverUrl: string, videoUrl: string): Promise<T> {
  if (!isSupportedVideoUrl(videoUrl)) {
    throw new Error("Blob or protected video URLs must be downloaded and uploaded as a local file")
  }

  const response = await fetchFn(videoUrl)
  if (!response.ok) {
    throw new Error("Unable to download this video; save it locally and upload the file")
  }

  const blob = await response.blob()
  const name = new URL(videoUrl).pathname.split("/").pop() || "web-video.mp4"
  return uploadVideoBlob<T>(fetchFn, serverUrl, blob, name)
}

export async function pollVideoJob<T extends { status: string }>(
  fetchFn: typeof fetch,
  serverUrl: string,
  jobId: string,
  options?: {
    wait?: (ms: number) => Promise<void>
    intervalMs?: number
    onUpdate?: (job: T) => void
  }
): Promise<T> {
  const config = options || {}
  const wait = config.wait || ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const intervalMs = config.intervalMs === undefined ? 1500 : config.intervalMs

  for (let attempt = 0; attempt < 240; attempt += 1) {
    const job = await responseJson<T>(await fetchFn(`${trimBase(serverUrl)}/api/video-jobs/${jobId}`))
    if (config.onUpdate) config.onUpdate(job)
    if (job.status === "completed" || job.status === "failed") return job
    await wait(intervalMs)
  }

  throw new Error("Video analysis timed out")
}
