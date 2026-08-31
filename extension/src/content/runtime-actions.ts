import {
  blobToDataUrl,
  sendRuntimeCommand,
  type RuntimeMessageSender
} from "../runtime/command-client"
import type {
  AnalysisJob,
  AssetKind,
  SerializedBlobInput
} from "../runtime/contracts"

export async function serializedBlobPayload(blob: Blob, filename: string): Promise<SerializedBlobInput> {
  return {
    dataUrl: await blobToDataUrl(blob),
    filename,
    mimeType: blob.type || "application/octet-stream"
  }
}

export async function analyzeImageWithRuntime(
  blob: Blob,
  filename: string,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  const job = await sendRuntimeCommand<AnalysisJob>({
    type: "runtime.analysis.image.start",
    payload: await serializedBlobPayload(blob, filename)
  }, sender)
  return job.result
}

export async function regenerateImagePromptWithRuntime(
  blob: Blob,
  filename: string,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  return analyzeImageWithRuntime(blob, filename, sender)
}

export async function checkImageSimilarityWithRuntime(
  blob: Blob,
  filename: string,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  return sendRuntimeCommand({
    type: "runtime.asset.image.similarity",
    payload: await serializedBlobPayload(blob, filename)
  }, sender)
}

export async function saveImageWithRuntime(
  blob: Blob,
  filename: string,
  weekStart: string,
  dayOfWeek: number,
  analysis?: unknown,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  return sendRuntimeCommand({
    type: "runtime.asset.image.save",
    payload: {
      ...(await serializedBlobPayload(blob, filename)),
      weekStart,
      dayOfWeek,
      ...(analysis !== undefined ? { analysis } : {})
    }
  }, sender)
}

export async function startVideoWithRuntime(
  blob: Blob,
  filename: string,
  durationMs?: number,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  const job = await sendRuntimeCommand<AnalysisJob>({
    type: "runtime.analysis.video.start",
    payload: {
      ...(await serializedBlobPayload(blob, filename)),
      draft: true,
      ...(Number.isFinite(durationMs) && (durationMs as number) > 0
        ? { durationMs: Math.round(durationMs as number) }
        : {})
    }
  }, sender)
  return job.result || { videoId: job.assetId, jobId: job.id, status: job.status }
}

export async function getVideoDetailWithRuntime(
  videoId: string,
  sender?: RuntimeMessageSender
): Promise<unknown> {
  return sendRuntimeCommand({
    type: "runtime.asset.video.get",
    payload: { assetId: videoId }
  }, sender)
}

export async function getContentUrlWithRuntime(
  kind: AssetKind,
  reference: string,
  sender?: RuntimeMessageSender
): Promise<string> {
  try {
    return await sendRuntimeCommand<string>({
      type: "runtime.asset.content.url",
      payload: { kind, reference }
    }, sender)
  } catch (error) {
    const detail = error && typeof error === "object" && "detail" in error
      ? (error as { detail?: { code?: string } }).detail
      : undefined
    if (detail?.code !== "LOCAL_CONTENT_URL_UNAVAILABLE") {
      throw error
    }
    const content = await sendRuntimeCommand<{ dataUrl: string }>({
      type: "runtime.asset.content.read",
      payload: { assetId: reference }
    }, sender)
    return content.dataUrl
  }
}
