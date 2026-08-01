import type {
  Asset,
  AssetPatch,
  AssetQuery,
  AssetRepository,
  CreateAssetInput,
  Page
} from "../contracts"
import { RuntimeFailure } from "../errors"
import { BackendHttpClient } from "./http-client"

type RepositoryOptions = {
  createId?: () => string
  now?: () => string
}

export class BackendAssetRepository implements AssetRepository {
  private readonly client: BackendHttpClient
  private readonly createId: () => string
  private readonly now: () => string
  private readonly drafts = new Map<string, Asset>()

  constructor(client: BackendHttpClient, options: RepositoryOptions = {}) {
    this.client = client
    this.createId = options.createId || (() => crypto.randomUUID())
    this.now = options.now || (() => new Date().toISOString())
  }

  getWeek<T = { week: { id: string } }>(weekStart: string): Promise<T> {
    return this.client.request<T>(`/api/weeks/${encodeURIComponent(weekStart)}`)
  }

  saveImageBlob<T = unknown>(blob: Blob, filename: string, weekId: string, dayOfWeek: number): Promise<T> {
    const form = new FormData()
    form.append("image", blob, filename || "screenshot.jpg")
    form.append("weekId", weekId)
    form.append("dayOfWeek", String(dayOfWeek))
    return this.client.request<T>("/api/images", { method: "POST", body: form })
  }

  checkImageSimilarity<T = unknown>(blob: Blob, filename = "image.jpg"): Promise<T> {
    const form = new FormData()
    form.append("image", blob, filename)
    return this.client.request<T>("/api/images/check-similarity", { method: "POST", body: form })
  }

  saveVideo<T = unknown>(videoId: string): Promise<T> {
    return this.client.request<T>(`/api/videos/${encodeURIComponent(videoId)}/save`, { method: "POST" })
  }

  getVideoDetail<T = unknown>(videoId: string): Promise<T> {
    return this.client.request<T>(`/api/videos/${encodeURIComponent(videoId)}`)
  }

  deleteVideo<T = unknown>(videoId: string): Promise<T> {
    return this.client.request<T>(`/api/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" })
  }

  deleteImage<T = unknown>(imageId: string): Promise<T> {
    return this.client.request<T>(`/api/images/${encodeURIComponent(imageId)}`, { method: "DELETE" })
  }

  getImageContentUrl(filePath: string): string {
    return this.client.buildUrl(`/api/uploads/${encodeURIComponent(filePath)}`)
  }

  getVideoContentUrl(videoId: string): string {
    return this.client.buildUrl(`/api/videos/${encodeURIComponent(videoId)}/content`)
  }

  async createDraft(input: CreateAssetInput): Promise<Asset> {
    const timestamp = this.now()
    const asset: Asset = {
      id: this.createId(),
      kind: input.kind,
      state: "draft",
      mode: "backend",
      createdAt: timestamp,
      updatedAt: timestamp
    }
    this.drafts.set(asset.id, asset)
    return asset
  }

  async save(assetId: string): Promise<Asset> {
    const asset = this.drafts.get(assetId)
    if (!asset) {
      throw new RuntimeFailure({
        code: "ASSET_NOT_FOUND",
        message: "Asset draft was not found",
        retryable: false
      })
    }
    if (asset.kind === "video") await this.saveVideo(asset.id)
    if (asset.kind === "image") {
      throw new RuntimeFailure({
        code: "IMAGE_PLACEMENT_REQUIRED",
        message: "Saving a backend image requires a week and day placement",
        retryable: false
      })
    }
    const saved = { ...asset, state: "saved" as const, updatedAt: this.now() }
    this.drafts.set(saved.id, saved)
    return saved
  }

  async get(assetId: string): Promise<Asset | null> {
    return this.drafts.get(assetId) || null
  }

  async list(query: AssetQuery): Promise<Page<Asset>> {
    const limit = Math.max(1, query.limit || 50)
    const items = Array.from(this.drafts.values())
      .filter((asset) => !query.state || asset.state === query.state)
      .filter((asset) => !query.kind || asset.kind === query.kind)
      .slice(0, limit)
    return { items }
  }

  async update(assetId: string, patch: AssetPatch): Promise<Asset> {
    const current = this.drafts.get(assetId)
    if (!current) {
      throw new RuntimeFailure({ code: "ASSET_NOT_FOUND", message: "Asset draft was not found", retryable: false })
    }
    const updated = { ...current, ...patch, updatedAt: this.now() }
    this.drafts.set(assetId, updated)
    return updated
  }

  async delete(assetId: string): Promise<void> {
    this.drafts.delete(assetId)
  }
}
