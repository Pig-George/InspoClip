import type {
  Asset,
  AssetPatch,
  AssetQuery,
  AssetRepository,
  BlobRef,
  BlobStore,
  CreateAssetInput,
  ImageAnalysisInput,
  ImageSaveInput,
  Page
} from "../contracts"
import { RuntimeFailure } from "../errors"
import { requestToPromise, transactionDone } from "./indexed-db"

type RepositoryOptions = {
  createId?: () => string
  now?: () => string
}

function fileExtension(filename: string, mimeType: string): string {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]{1,10})$/)
  if (match) return match[1]
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "video/webm") return "webm"
  if (mimeType === "video/mp4") return "mp4"
  return "bin"
}

function contentMatches(asset: Asset, search: string): boolean {
  if (!search) return true
  const haystack = [
    asset.title,
    asset.titleEn,
    asset.titleZh,
    asset.filename,
    ...(asset.tags || [])
  ].filter(Boolean).join(" ").toLocaleLowerCase()
  return haystack.includes(search.toLocaleLowerCase())
}

export class IndexedDbAssetRepository implements AssetRepository {
  private readonly createId: () => string
  private readonly now: () => string

  constructor(
    private readonly database: IDBDatabase,
    private readonly blobs: BlobStore,
    options: RepositoryOptions = {}
  ) {
    this.createId = options.createId || (() => crypto.randomUUID())
    this.now = options.now || (() => new Date().toISOString())
  }

  async createDraft(input: CreateAssetInput): Promise<Asset> {
    const id = this.createId()
    const timestamp = this.now()
    const extension = fileExtension(input.filename, input.mimeType)
    const key = `${input.kind === "image" ? "images" : "videos"}/${id}/original.${extension}`
    const blob = await this.blobs.put(key, input.blob)
    const asset: Asset = {
      id,
      kind: input.kind,
      state: "draft",
      mode: "standalone",
      filename: input.filename,
      mimeType: input.mimeType || input.blob.type,
      size: input.blob.size,
      source: input.source,
      blob,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    try {
      const transaction = this.database.transaction("assets", "readwrite")
      transaction.objectStore("assets").add(structuredClone(asset))
      await transactionDone(transaction)
      return asset
    } catch (error) {
      await this.blobs.delete(blob).catch(() => undefined)
      throw error
    }
  }

  async save(assetId: string): Promise<Asset> {
    const asset = await this.requireAsset(assetId)
    const saved = { ...asset, state: "saved" as const, updatedAt: this.now() }
    await this.putAsset(saved)
    return saved
  }

  async get(assetId: string): Promise<Asset | null> {
    const transaction = this.database.transaction("assets", "readonly")
    const value = await requestToPromise(transaction.objectStore("assets").get(assetId))
    await transactionDone(transaction)
    return (value as Asset | undefined) || null
  }

  async list(query: AssetQuery): Promise<Page<Asset>> {
    const transaction = this.database.transaction("assets", "readonly")
    const values = await requestToPromise(transaction.objectStore("assets").getAll()) as Asset[]
    await transactionDone(transaction)
    const state = query.state || "saved"
    const offset = Math.max(0, Number.parseInt(query.cursor || "0", 10) || 0)
    const limit = Math.min(200, Math.max(1, query.limit || 50))
    const filtered = values
      .filter((asset) => asset.state === state)
      .filter((asset) => !query.kind || asset.kind === query.kind)
      .filter((asset) => contentMatches(asset, query.search || ""))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
    const items = filtered.slice(offset, offset + limit)
    return {
      items,
      ...(offset + limit < filtered.length ? { nextCursor: String(offset + limit) } : {})
    }
  }

  async update(assetId: string, patch: AssetPatch): Promise<Asset> {
    const asset = await this.requireAsset(assetId)
    const updated = { ...asset, ...structuredClone(patch), updatedAt: this.now() }
    await this.putAsset(updated)
    return updated
  }

  async delete(assetId: string): Promise<void> {
    const asset = await this.get(assetId)
    if (!asset) return
    if (asset.blob) await this.blobs.delete(asset.blob)
    if (asset.thumbnail) await this.blobs.delete(asset.thumbnail)
    const transaction = this.database.transaction("assets", "readwrite")
    transaction.objectStore("assets").delete(assetId)
    await transactionDone(transaction)
  }

  async checkImageSimilarity(_input: ImageAnalysisInput): Promise<unknown> {
    return { similar: [] }
  }

  async saveImage(input: ImageSaveInput): Promise<unknown> {
    const asset = await this.createDraft({
      kind: "image",
      blob: input.blob,
      filename: input.filename,
      mimeType: input.mimeType,
      source: "extension"
    })
    return this.save(asset.id)
  }

  saveVideo(assetId: string): Promise<unknown> {
    return this.save(assetId)
  }

  async getVideoDetail(assetId: string): Promise<unknown> {
    const asset = await this.get(assetId)
    return asset ? { video: asset, analysis: asset.analysis || null } : null
  }

  getContentUrl(_kind: "image" | "video", _reference: string): string {
    throw new RuntimeFailure({
      code: "LOCAL_CONTENT_URL_UNAVAILABLE",
      message: "Open local media from the InspoClip local library",
      retryable: false
    })
  }

  private async requireAsset(assetId: string): Promise<Asset> {
    const asset = await this.get(assetId)
    if (!asset) throw new RuntimeFailure({ code: "ASSET_NOT_FOUND", message: "Local asset was not found", retryable: false })
    return asset
  }

  private async putAsset(asset: Asset): Promise<void> {
    const transaction = this.database.transaction("assets", "readwrite")
    transaction.objectStore("assets").put(structuredClone(asset))
    await transactionDone(transaction)
  }
}
