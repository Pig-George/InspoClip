import { BackendAnalysisAdapter, isSupportedBackendVideoUrl, type PollVideoJobOptions } from "./runtime/backend/backend-analysis-adapter"
import { BackendHttpClient } from "./runtime/backend/http-client"
import { toRuntimeError } from "./runtime/errors"

function trimBase(url: string): string {
  return String(url || "").replace(/\/+$/, "")
}

function createAdapter(fetchFn: typeof fetch, serverUrl: string): BackendAnalysisAdapter {
  return new BackendAnalysisAdapter(new BackendHttpClient(serverUrl, fetchFn), fetchFn)
}

export function isSupportedVideoUrl(value: string): boolean {
  return isSupportedBackendVideoUrl(value)
}

export function buildClientVideoUrl(appUrl: string, videoId: string): string {
  const url = new URL(trimBase(appUrl) + "/")
  url.searchParams.set("video", videoId)
  return url.toString()
}

export async function uploadVideoBlob<T = unknown>(
  fetchFn: typeof fetch,
  serverUrl: string,
  blob: Blob,
  filename?: string,
  options?: { draft?: boolean }
): Promise<T> {
  return createAdapter(fetchFn, serverUrl).uploadVideoBlobRaw<T>({
    blob,
    filename: filename || "video.mp4",
    mimeType: blob.type || "video/mp4",
    draft: options?.draft
  })
}

export async function uploadVideoUrl<T = unknown>(
  fetchFn: typeof fetch,
  serverUrl: string,
  videoUrl: string,
  options?: { draft?: boolean }
): Promise<T> {
  return createAdapter(fetchFn, serverUrl).uploadVideoUrl<T>(videoUrl, options)
}

export async function pollVideoJob<T extends { status: string }>(
  fetchFn: typeof fetch,
  serverUrl: string,
  jobId: string,
  options?: PollVideoJobOptions<T>
): Promise<T> {
  try {
    return await createAdapter(fetchFn, serverUrl).pollVideoJobRaw<T>(jobId, options)
  } catch (error) {
    if (toRuntimeError(error).code === "NETWORK_ERROR") throw new TypeError("Failed to fetch")
    throw error
  }
}
