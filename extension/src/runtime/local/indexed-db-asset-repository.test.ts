import { IDBFactory } from "fake-indexeddb"
import { afterEach, describe, expect, test } from "vitest"

import type { BlobRef, BlobStore, StorageUsage } from "../contracts"
import { openInspoClipDb } from "./indexed-db"
import { IndexedDbAssetRepository } from "./indexed-db-asset-repository"

class MemoryBlobStore implements BlobStore {
  values = new Map<string, Blob>()
  deleted: string[] = []

  async put(key: string, blob: Blob): Promise<BlobRef> {
    this.values.set(key, blob)
    return { store: "standalone", key, mimeType: blob.type, size: blob.size }
  }

  async get(ref: BlobRef): Promise<Blob | null> {
    return this.values.get(ref.key) || null
  }

  async delete(ref: BlobRef): Promise<void> {
    this.deleted.push(ref.key)
    this.values.delete(ref.key)
  }

  async usage(): Promise<StorageUsage> {
    return { usedBytes: Array.from(this.values.values()).reduce((sum, blob) => sum + blob.size, 0) }
  }
}

const openDatabases: IDBDatabase[] = []

afterEach(() => {
  openDatabases.splice(0).forEach((database) => database.close())
})

async function setup() {
  const factory = new IDBFactory()
  const database = await openInspoClipDb(factory, `test-assets-${crypto.randomUUID()}`)
  openDatabases.push(database)
  const blobs = new MemoryBlobStore()
  let id = 0
  let timestamp = 0
  const repository = new IndexedDbAssetRepository(database, blobs, {
    createId: () => `asset-${++id}`,
    now: () => new Date(Date.UTC(2026, 7, 1, 0, 0, timestamp++)).toISOString()
  })
  return { database, blobs, repository }
}

describe("IndexedDbAssetRepository", () => {
  test("creates persistent image and video drafts with blob references", async () => {
    const { database, blobs, repository } = await setup()

    const image = await repository.createDraft({
      kind: "image",
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "capture.png",
      mimeType: "image/png"
    })
    const video = await repository.createDraft({
      kind: "video",
      blob: new Blob(["video"], { type: "video/webm" }),
      filename: "recording.webm",
      mimeType: "video/webm",
      durationMs: 10_250
    })

    expect(image).toMatchObject({ id: "asset-1", kind: "image", state: "draft", mode: "standalone", filename: "capture.png" })
    expect(video).toMatchObject({ id: "asset-2", kind: "video", state: "draft", filename: "recording.webm", durationMs: 10_250 })
    expect(image.blob?.key).toBe("images/asset-1/original.png")
    expect(video.blob?.key).toBe("videos/asset-2/original.webm")
    expect(await blobs.get(image.blob as BlobRef)).toBeInstanceOf(Blob)

    const restored = new IndexedDbAssetRepository(database, blobs)
    await expect(restored.get("asset-2")).resolves.toMatchObject({ kind: "video", filename: "recording.webm", durationMs: 10_250 })
  })

  test("lists only saved assets by default and keeps drafts isolated", async () => {
    const { repository } = await setup()
    const first = await repository.createDraft({ kind: "image", blob: new Blob(["1"]), filename: "one.png", mimeType: "image/png" })
    const second = await repository.createDraft({ kind: "video", blob: new Blob(["2"]), filename: "two.mp4", mimeType: "video/mp4" })
    await repository.save(second.id)

    await expect(repository.list({})).resolves.toMatchObject({ items: [{ id: second.id, state: "saved" }] })
    await expect(repository.list({ state: "draft" })).resolves.toMatchObject({ items: [{ id: first.id, state: "draft" }] })
  })

  test("updates searchable metadata and paginates deterministically", async () => {
    const { repository } = await setup()
    const first = await repository.createDraft({ kind: "image", blob: new Blob(["1"]), filename: "one.png", mimeType: "image/png" })
    const second = await repository.createDraft({ kind: "image", blob: new Blob(["2"]), filename: "two.png", mimeType: "image/png" })
    await repository.save(first.id)
    await repository.save(second.id)
    await repository.update(first.id, { title: "Button motion", tags: ["UI"] })

    const pageOne = await repository.list({ search: "button", limit: 1 })
    expect(pageOne.items).toMatchObject([{ id: first.id, title: "Button motion" }])
    expect(pageOne.nextCursor).toBeUndefined()

    const allFirstPage = await repository.list({ limit: 1 })
    const allSecondPage = await repository.list({ limit: 1, cursor: allFirstPage.nextCursor })
    expect(allFirstPage.items[0].id).not.toBe(allSecondPage.items[0].id)
  })

  test("keeps completed image analysis when saving an image", async () => {
    const { repository } = await setup()
    const analysis = {
      terms: ["card layout / 卡片布局"],
      colors: ["#3377cc"],
      prompt: { en: "A card layout", zh: "卡片布局" }
    }

    const saved = await repository.saveImage({
      blob: new Blob(["image"], { type: "image/png" }),
      filename: "capture.png",
      mimeType: "image/png",
      weekStart: "2026-08-03",
      dayOfWeek: 0,
      analysis
    }) as { id: string; state: string; analysis?: unknown }

    expect(saved).toMatchObject({ state: "saved", analysis })
    await expect(repository.get(saved.id)).resolves.toMatchObject({ state: "saved", analysis })
  })

  test("deletes metadata and its original blob", async () => {
    const { blobs, repository } = await setup()
    const asset = await repository.createDraft({ kind: "video", blob: new Blob(["video"]), filename: "demo.mp4", mimeType: "video/mp4" })

    await repository.delete(asset.id)

    await expect(repository.get(asset.id)).resolves.toBeNull()
    expect(blobs.deleted).toEqual([asset.blob?.key])
  })

  test("rolls back a written blob when the metadata transaction cannot start", async () => {
    const { database, blobs, repository } = await setup()
    database.close()

    await expect(repository.createDraft({
      kind: "image",
      blob: new Blob(["image"]),
      filename: "capture.png",
      mimeType: "image/png"
    })).rejects.toBeDefined()
    expect(blobs.values.size).toBe(0)
    expect(blobs.deleted).toEqual(["images/asset-1/original.png"])
  })
})
