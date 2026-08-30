export type RuntimeMode = "backend" | "standalone"
export type AssetKind = "image" | "video"
export type AssetState = "draft" | "saved"
export type AnalysisJobStatus = "queued" | "uploading" | "processing" | "completed" | "failed" | "cancelled"

export type RuntimeErrorAction = "open-settings" | "retry" | "switch-mode" | "free-space"

export type RuntimeError = {
  code: string
  message: string
  retryable: boolean
  action?: RuntimeErrorAction
}

export type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RuntimeError }

export function success<T>(data: T): CommandResult<T> {
  return { ok: true, data }
}

export function failure<T = never>(error: RuntimeError): CommandResult<T> {
  return { ok: false, error }
}

export type BlobRef = {
  store: RuntimeMode
  key: string
  mimeType: string
  size: number
}

export type StorageUsage = {
  usedBytes: number
  quotaBytes?: number
}

export type Asset = {
  id: string
  kind: AssetKind
  state: AssetState
  mode: RuntimeMode
  createdAt: string
  updatedAt: string
  title?: string
  titleEn?: string
  titleZh?: string
  filename?: string
  mimeType?: string
  size?: number
  source?: string
  durationMs?: number
  blob?: BlobRef
  thumbnail?: BlobRef
  analysis?: unknown
  tags?: string[]
}

export type AnalysisJob = {
  id: string
  assetId: string
  assetKind: AssetKind
  mode: RuntimeMode
  status: AnalysisJobStatus
  progress?: number
  result?: unknown
  error?: RuntimeError
  provider?: string
  model?: string
  retryCount?: number
  nextRetryAt?: string
  remoteFileId?: string
  createdAt: string
  updatedAt: string
}

export function isTerminalJobStatus(status: AnalysisJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled"
}

export type CreateAssetInput = {
  kind: AssetKind
  blob: Blob
  filename: string
  mimeType: string
  source?: string
  durationMs?: number
  analysis?: unknown
}

export type AssetPatch = Partial<Pick<Asset, "title" | "titleEn" | "titleZh" | "tags" | "analysis" | "durationMs">>

export type AssetQuery = {
  state?: AssetState
  kind?: AssetKind
  search?: string
  cursor?: string
  limit?: number
}

export type Page<T> = {
  items: T[]
  nextCursor?: string
}

export type ImageAnalysisInput = {
  assetId?: string
  blob: Blob
  filename: string
  mimeType: string
}

export type VideoAnalysisInput = ImageAnalysisInput & {
  draft?: boolean
  durationMs?: number
}

export type ImageSaveInput = ImageAnalysisInput & {
  weekStart: string
  dayOfWeek: number
  /** Analysis produced before the image was saved. Kept with the local asset for later prompt generation. */
  analysis?: unknown
}

export type PromptGenerationInput = {
  assetId: string
  purpose?: string
  language?: string
  target?: string
  regenerate?: boolean
}

export type PromptResult = {
  assetId: string
  content: unknown
}

export interface AssetRepository {
  createDraft(input: CreateAssetInput): Promise<Asset>
  save(assetId: string): Promise<Asset>
  get(assetId: string): Promise<Asset | null>
  list(query: AssetQuery): Promise<Page<Asset>>
  update(assetId: string, patch: AssetPatch): Promise<Asset>
  delete(assetId: string): Promise<void>
  checkImageSimilarity(input: ImageAnalysisInput): Promise<unknown>
  saveImage(input: ImageSaveInput): Promise<unknown>
  saveVideo(assetId: string): Promise<unknown>
  getVideoDetail(assetId: string): Promise<unknown>
  getContentUrl(kind: AssetKind, reference: string): string
}

export interface AnalysisAdapter {
  analyzeImage(input: ImageAnalysisInput): Promise<AnalysisJob>
  analyzeVideo(input: VideoAnalysisInput): Promise<AnalysisJob>
  analyzeVideoUrl(videoUrl: string, options?: { draft?: boolean }): Promise<AnalysisJob>
  generatePrompt(input: PromptGenerationInput): Promise<PromptResult>
  getJob(jobId: string): Promise<AnalysisJob | null>
  cancelJob(jobId: string): Promise<void>
}

export interface JobRepository {
  put(job: AnalysisJob): Promise<void>
  get(jobId: string): Promise<AnalysisJob | null>
  listActive(): Promise<AnalysisJob[]>
  remove(jobId: string): Promise<void>
}

export interface BlobStore {
  put(key: string, blob: Blob): Promise<BlobRef>
  get(ref: BlobRef): Promise<Blob | null>
  delete(ref: BlobRef): Promise<void>
  usage(): Promise<StorageUsage>
}

export type ExtensionRuntime = {
  mode: RuntimeMode
  assets: AssetRepository
  analysis: AnalysisAdapter
  jobs?: JobRepository
  blobs?: BlobStore
}

export type SerializedBlobInput = {
  dataUrl: string
  filename: string
  mimeType: string
  assetId?: string
}

export type ExtensionCommand =
  | { type: "runtime.asset.createDraft"; payload: SerializedBlobInput & { kind: AssetKind; source?: string } }
  | { type: "runtime.asset.save"; payload: { assetId: string } }
  | { type: "runtime.asset.delete"; payload: { assetId: string; kind: AssetKind } }
  | { type: "runtime.asset.update"; payload: { assetId: string; patch: AssetPatch } }
  | { type: "runtime.asset.get"; payload: { assetId: string } }
  | { type: "runtime.asset.list"; payload: AssetQuery }
  | { type: "runtime.asset.image.similarity"; payload: SerializedBlobInput }
  | { type: "runtime.asset.image.save"; payload: SerializedBlobInput & { weekStart: string; dayOfWeek: number; analysis?: unknown } }
  | { type: "runtime.asset.video.get"; payload: { assetId: string } }
  | { type: "runtime.asset.video.save"; payload: { assetId: string } }
  | { type: "runtime.asset.content.url"; payload: { kind: AssetKind; reference: string } }
  | { type: "runtime.asset.content.read"; payload: { assetId: string } }
  | { type: "runtime.analysis.image.start"; payload: SerializedBlobInput }
  | { type: "runtime.analysis.video.start"; payload: SerializedBlobInput & { draft?: boolean; durationMs?: number } }
  | { type: "runtime.analysis.video.url.start"; payload: { videoUrl: string; draft?: boolean } }
  | { type: "runtime.analysis.job.get"; payload: { jobId: string } }
  | { type: "runtime.analysis.job.cancel"; payload: { jobId: string } }
  | { type: "runtime.storage.usage"; payload: Record<string, never> }
  | { type: "runtime.prompt.generate"; payload: PromptGenerationInput }

export function isExtensionCommand(value: unknown): value is ExtensionCommand {
  return Boolean(
    value
      && typeof value === "object"
      && "type" in value
      && typeof value.type === "string"
      && value.type.startsWith("runtime.")
      && "payload" in value
  )
}
