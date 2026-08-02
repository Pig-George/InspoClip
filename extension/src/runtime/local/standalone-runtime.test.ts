import { IDBFactory } from "fake-indexeddb"
import { afterEach, describe, expect, test } from "vitest"

import type { BlobRef, BlobStore, StorageUsage } from "../contracts"
import { createStandaloneRuntime } from "./standalone-runtime"

class MemoryBlobStore implements BlobStore {
  values = new Map<string, Blob>()
  async put(key: string, blob: Blob): Promise<BlobRef> {
    this.values.set(key, blob)
    return { store: "standalone", key, mimeType: blob.type, size: blob.size }
  }
  async get(ref: BlobRef): Promise<Blob | null> { return this.values.get(ref.key) || null }
  async delete(ref: BlobRef): Promise<void> { this.values.delete(ref.key) }
  async usage(): Promise<StorageUsage> { return { usedBytes: 0 } }
}

const databases: IDBDatabase[] = []
afterEach(() => databases.splice(0).forEach((database) => database.close()))

describe("createStandaloneRuntime", () => {
  test("combines persistent assets, jobs, blobs and a local-only analysis gate", async () => {
    const blobs = new MemoryBlobStore()
    const runtime = await createStandaloneRuntime({
      indexedDb: new IDBFactory(),
      databaseName: `standalone-${crypto.randomUUID()}`,
      blobs,
      onDatabaseOpen: (database) => databases.push(database)
    })

    expect(runtime.mode).toBe("standalone")
    expect(runtime.blobs).toBe(blobs)
    expect(runtime.jobs).toBeDefined()

    const draft = await runtime.assets.createDraft({
      kind: "video",
      blob: new Blob(["video"], { type: "video/mp4" }),
      filename: "demo.mp4",
      mimeType: "video/mp4"
    })
    await expect(runtime.assets.get(draft.id)).resolves.toMatchObject({ kind: "video", state: "draft" })
    await expect(runtime.analysis.analyzeVideo({
      blob: new Blob(["video"]),
      filename: "demo.mp4",
      mimeType: "video/mp4"
    })).rejects.toMatchObject({ detail: { code: "MODEL_CONFIGURATION_REQUIRED" } })
  })
})
