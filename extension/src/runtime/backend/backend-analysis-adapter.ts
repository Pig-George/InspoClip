import type {
  AnalysisAdapter,
  AnalysisJob,
  AnalysisJobStatus,
  ImageAnalysisInput,
  PromptGenerationInput,
  PromptResult,
  VideoAnalysisInput
} from "../contracts"
import { RuntimeFailure, toRuntimeError } from "../errors"
import { BackendHttpClient, type FetchLike } from "./http-client"

type AdapterOptions = {
  createId?: () => string
  now?: () => string
}

type BackendVideoUpload = {
  videoId: string
  jobId: string
  status: string
}

type BackendVideoJob = {
  id?: string
  videoId?: string
  status: string
  progress?: number
  result?: unknown
  error?: unknown
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export type PollVideoJobOptions<T> = {
  wait?: (ms: number) => Promise<void>
  intervalMs?: number
  maxNetworkRetries?: number
  retryBaseMs?: number
  retryMaxMs?: number
  onUpdate?: (job: T) => void
}

function mapStatus(status: string): AnalysisJobStatus {
  if (status === "pending") return "queued"
  if (status === "uploading") return "uploading"
  if (status === "processing") return "processing"
  if (status === "completed") return "completed"
  if (status === "failed") return "failed"
  if (status === "cancelled") return "cancelled"
  return "processing"
}

export function isSupportedBackendVideoUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export class BackendAnalysisAdapter implements AnalysisAdapter {
  private readonly client: BackendHttpClient
  private readonly fetchFn: FetchLike
  private readonly createId: () => string
  private readonly now: () => string

  constructor(client: BackendHttpClient, fetchFn: FetchLike = fetch, options: AdapterOptions = {}) {
    this.client = client
    this.fetchFn = fetchFn
    this.createId = options.createId || (() => crypto.randomUUID())
    this.now = options.now || (() => new Date().toISOString())
  }

  async analyzeImageRaw<T = unknown>(input: ImageAnalysisInput): Promise<T> {
    const form = new FormData()
    form.append("image", input.blob, input.filename || "asset.png")
    return this.client.request<T>("/api/images/analyze", { method: "POST", body: form })
  }

  async analyzeImage(input: ImageAnalysisInput): Promise<AnalysisJob> {
    const result = await this.analyzeImageRaw(input)
    const timestamp = this.now()
    const id = this.createId()
    return {
      id,
      assetId: input.assetId || id,
      assetKind: "image",
      mode: "backend",
      status: "completed",
      progress: 100,
      result,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  }

  async uploadVideoBlobRaw<T = BackendVideoUpload>(input: VideoAnalysisInput): Promise<T> {
    const form = new FormData()
    form.append("video", input.blob, input.filename || "video.mp4")
    form.append("source", "extension")
    if (input.draft) form.append("draft", "true")
    if (Number.isFinite(input.durationMs) && Number(input.durationMs) > 0) {
      form.append("durationMs", String(Math.round(Number(input.durationMs))))
    }
    return this.client.request<T>("/api/videos", { method: "POST", body: form })
  }

  async analyzeVideo(input: VideoAnalysisInput): Promise<AnalysisJob> {
    const result = await this.uploadVideoBlobRaw<BackendVideoUpload>(input)
    const timestamp = this.now()
    return {
      id: result.jobId,
      assetId: result.videoId,
      assetKind: "video",
      mode: "backend",
      status: mapStatus(result.status),
      progress: 0,
      result,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  }

  async uploadVideoUrl<T = BackendVideoUpload>(videoUrl: string, options?: { draft?: boolean }): Promise<T> {
    if (!isSupportedBackendVideoUrl(videoUrl)) {
      throw new RuntimeFailure({
        code: "VIDEO_URL_UNSUPPORTED",
        message: "Blob or protected video URLs must be downloaded and uploaded as a local file",
        retryable: false
      })
    }

    let response: Response
    try {
      response = await this.fetchFn.call(globalThis, videoUrl)
    } catch {
      throw new RuntimeFailure({
        code: "VIDEO_DOWNLOAD_FAILED",
        message: "Unable to download this video; save it locally and upload the file",
        retryable: true,
        action: "retry"
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure({
        code: "VIDEO_DOWNLOAD_FAILED",
        message: "Unable to download this video; save it locally and upload the file",
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        ...(response.status === 408 || response.status === 429 || response.status >= 500 ? { action: "retry" as const } : {})
      })
    }

    const blob = await response.blob()
    const name = new URL(videoUrl).pathname.split("/").pop() || "web-video.mp4"
    return this.uploadVideoBlobRaw<T>({
      blob,
      filename: name,
      mimeType: blob.type || "video/mp4",
      draft: options?.draft
    })
  }

  async analyzeVideoUrl(videoUrl: string, options?: { draft?: boolean }): Promise<AnalysisJob> {
    const result = await this.uploadVideoUrl<BackendVideoUpload>(videoUrl, options)
    const timestamp = this.now()
    return {
      id: result.jobId,
      assetId: result.videoId,
      assetKind: "video",
      mode: "backend",
      status: mapStatus(result.status),
      progress: 0,
      result,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  }

  getVideoJobRaw<T extends { status: string }>(jobId: string): Promise<T> {
    return this.client.request<T>(`/api/video-jobs/${encodeURIComponent(jobId)}`)
  }

  async pollVideoJobRaw<T extends { status: string }>(jobId: string, options: PollVideoJobOptions<T> = {}): Promise<T> {
    const wait = options.wait || ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
    const intervalMs = options.intervalMs === undefined ? 1500 : options.intervalMs
    const maxNetworkRetries = Math.max(0, Math.floor(options.maxNetworkRetries ?? 6))
    const retryBaseMs = Math.max(0, options.retryBaseMs ?? intervalMs)
    const retryMaxMs = Math.max(retryBaseMs, options.retryMaxMs ?? 5000)
    let successfulPolls = 0
    let consecutiveNetworkErrors = 0

    while (successfulPolls < 240) {
      let job: T
      try {
        job = await this.getVideoJobRaw<T>(jobId)
      } catch (error) {
        const runtimeError = toRuntimeError(error)
        if (runtimeError.code !== "NETWORK_ERROR" || consecutiveNetworkErrors >= maxNetworkRetries) throw error
        const retryDelay = Math.min(retryMaxMs, retryBaseMs * 2 ** consecutiveNetworkErrors)
        consecutiveNetworkErrors += 1
        await wait(retryDelay)
        continue
      }

      consecutiveNetworkErrors = 0
      successfulPolls += 1
      options.onUpdate?.(job)
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") return job
      await wait(intervalMs)
    }

    throw new RuntimeFailure({
      code: "VIDEO_ANALYSIS_TIMEOUT",
      message: "Video analysis timed out",
      retryable: true,
      action: "retry"
    })
  }

  async getJob(jobId: string): Promise<AnalysisJob | null> {
    const raw = await this.getVideoJobRaw<BackendVideoJob>(jobId)
    const timestamp = this.now()
    return {
      id: raw.id || jobId,
      assetId: raw.videoId || "",
      assetKind: "video",
      mode: "backend",
      status: mapStatus(raw.status),
      progress: raw.progress,
      result: raw,
      createdAt: raw.createdAt || timestamp,
      updatedAt: raw.updatedAt || timestamp
    }
  }

  async generatePrompt(input: PromptGenerationInput): Promise<PromptResult> {
    if (input.purpose === "image-design") {
      const query = input.regenerate ? "?force=true" : ""
      const content = await this.client.request(`/api/images/${encodeURIComponent(input.assetId)}/prompt${query}`, {
        method: "GET"
      })
      return { assetId: input.assetId, content }
    }
    const purpose = input.purpose || "general"
    let content: unknown
    if (input.regenerate) {
      content = await this.client.request(`/api/videos/${encodeURIComponent(input.assetId)}/prompts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          purpose,
          ...(input.target ? { target: input.target } : {}),
          ...(input.language ? { language: input.language } : {}),
          force: true
        })
      })
    } else {
      const params = new URLSearchParams({ purpose })
      if (input.target) params.set("target", input.target)
      if (input.language) params.set("language", input.language)
      content = await this.client.request(`/api/videos/${encodeURIComponent(input.assetId)}/prompts?${params.toString()}`, {
        method: "GET"
      })
    }
    return { assetId: input.assetId, content }
  }

  async cancelJob(): Promise<void> {
    throw new RuntimeFailure({
      code: "JOB_CANCELLATION_UNSUPPORTED",
      message: "The current backend does not support cancelling analysis jobs",
      retryable: false
    })
  }
}
