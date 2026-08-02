import {
  failure,
  isExtensionCommand,
  success,
  type CommandResult,
  type ExtensionCommand,
  type ExtensionRuntime,
  type SerializedBlobInput
} from "./contracts"
import { toRuntimeError } from "./errors"

type RuntimeProvider = () => Promise<ExtensionRuntime>

function dataUrlToBlob(input: SerializedBlobInput): Blob {
  const commaIndex = input.dataUrl.indexOf(",")
  if (commaIndex < 0) throw new Error("Invalid asset data URL")
  const header = input.dataUrl.slice(0, commaIndex)
  const encoded = input.dataUrl.slice(commaIndex + 1)
  const binary = header.includes(";base64") ? atob(encoded) : decodeURIComponent(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: input.mimeType || header.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream" })
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`
}

async function execute(runtime: ExtensionRuntime, command: ExtensionCommand): Promise<unknown> {
  switch (command.type) {
    case "runtime.asset.createDraft":
      return runtime.assets.createDraft({
        kind: command.payload.kind,
        blob: dataUrlToBlob(command.payload),
        filename: command.payload.filename,
        mimeType: command.payload.mimeType,
        source: command.payload.source
      })
    case "runtime.asset.save":
      return runtime.assets.save(command.payload.assetId)
    case "runtime.asset.get":
      return runtime.assets.get(command.payload.assetId)
    case "runtime.asset.list":
      return runtime.assets.list(command.payload)
    case "runtime.asset.image.similarity":
      return runtime.assets.checkImageSimilarity({
        assetId: command.payload.assetId,
        blob: dataUrlToBlob(command.payload),
        filename: command.payload.filename,
        mimeType: command.payload.mimeType
      })
    case "runtime.asset.image.save":
      return runtime.assets.saveImage({
        assetId: command.payload.assetId,
        blob: dataUrlToBlob(command.payload),
        filename: command.payload.filename,
        mimeType: command.payload.mimeType,
        weekStart: command.payload.weekStart,
        dayOfWeek: command.payload.dayOfWeek
      })
    case "runtime.asset.video.get":
      return runtime.assets.getVideoDetail(command.payload.assetId)
    case "runtime.asset.video.save":
      return runtime.assets.saveVideo(command.payload.assetId)
    case "runtime.asset.content.url":
      return runtime.assets.getContentUrl(command.payload.kind, command.payload.reference)
    case "runtime.asset.content.read": {
      const asset = await runtime.assets.get(command.payload.assetId)
      if (!asset?.blob || !runtime.blobs) throw new Error("Local asset content is unavailable")
      const blob = await runtime.blobs.get(asset.blob)
      if (!blob) throw new Error("Local asset content is unavailable")
      return { dataUrl: await blobToDataUrl(blob), mimeType: blob.type || asset.mimeType || "application/octet-stream" }
    }
    case "runtime.analysis.image.start":
      return runtime.analysis.analyzeImage({
        assetId: command.payload.assetId,
        blob: dataUrlToBlob(command.payload),
        filename: command.payload.filename,
        mimeType: command.payload.mimeType
      })
    case "runtime.analysis.video.start":
      return runtime.analysis.analyzeVideo({
        assetId: command.payload.assetId,
        blob: dataUrlToBlob(command.payload),
        filename: command.payload.filename,
        mimeType: command.payload.mimeType,
        draft: command.payload.draft,
        durationMs: command.payload.durationMs
      })
    case "runtime.analysis.video.url.start":
      return runtime.analysis.analyzeVideoUrl(command.payload.videoUrl, { draft: command.payload.draft })
    case "runtime.analysis.job.get":
      return runtime.analysis.getJob(command.payload.jobId)
    case "runtime.analysis.job.cancel":
      return runtime.analysis.cancelJob(command.payload.jobId)
    case "runtime.storage.usage":
      return runtime.blobs?.usage() || { usedBytes: 0 }
    case "runtime.prompt.generate":
      return runtime.analysis.generatePrompt(command.payload)
  }
}

export function createCommandRouter(getRuntime: RuntimeProvider) {
  return {
    async dispatch(message: unknown): Promise<CommandResult<unknown> | undefined> {
      if (!isExtensionCommand(message)) return undefined
      try {
        return success(await execute(await getRuntime(), message))
      } catch (error) {
        return failure(toRuntimeError(error))
      }
    }
  }
}
