import { describe, expect, test } from "vitest"

import {
  OpfsBlobStore,
  type OpfsDirectoryHandle,
  type OpfsFileHandle,
  type OpfsWritable
} from "./opfs-blob-store"

class MemoryWritable implements OpfsWritable {
  constructor(private readonly save: (blob: Blob) => void) {}
  private value = new Blob()

  async write(data: Blob): Promise<void> {
    this.value = data
  }

  async close(): Promise<void> {
    this.save(this.value)
  }
}

class MemoryFileHandle implements OpfsFileHandle {
  value: Blob | null = null

  async getFile(): Promise<File> {
    if (!this.value) throw new DOMException("Not found", "NotFoundError")
    return new File([this.value], "blob", { type: this.value.type })
  }

  async createWritable(): Promise<OpfsWritable> {
    return new MemoryWritable((blob) => { this.value = blob })
  }
}

class MemoryDirectoryHandle implements OpfsDirectoryHandle {
  directories = new Map<string, MemoryDirectoryHandle>()
  files = new Map<string, MemoryFileHandle>()

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectoryHandle> {
    const existing = this.directories.get(name)
    if (existing) return existing
    if (!options?.create) throw new DOMException("Not found", "NotFoundError")
    const directory = new MemoryDirectoryHandle()
    this.directories.set(name, directory)
    return directory
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemoryFileHandle> {
    const existing = this.files.get(name)
    if (existing) return existing
    if (!options?.create) throw new DOMException("Not found", "NotFoundError")
    const file = new MemoryFileHandle()
    this.files.set(name, file)
    return file
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.files.delete(name) && !this.directories.delete(name)) {
      throw new DOMException("Not found", "NotFoundError")
    }
  }
}

describe("OpfsBlobStore", () => {
  test("writes and restores image and video blobs", async () => {
    const root = new MemoryDirectoryHandle()
    const store = new OpfsBlobStore({
      getRoot: async () => root,
      estimate: async () => ({ usage: 15, quota: 1024 })
    })

    const imageRef = await store.put("images/image-1/original.png", new Blob(["image"], { type: "image/png" }))
    const videoRef = await store.put("videos/video-1/original.mp4", new Blob(["video"], { type: "video/mp4" }))

    expect(imageRef).toEqual({ store: "standalone", key: "images/image-1/original.png", mimeType: "image/png", size: 5 })
    expect(videoRef.mimeType).toBe("video/mp4")
    expect(await (await store.get(imageRef))?.text()).toBe("image")
    expect(await (await store.get(videoRef))?.text()).toBe("video")
  })

  test("overwrites an existing blob atomically from the caller perspective", async () => {
    const root = new MemoryDirectoryHandle()
    const store = new OpfsBlobStore({ getRoot: async () => root })
    const first = await store.put("images/image-1/original.png", new Blob(["old"], { type: "image/png" }))
    const second = await store.put("images/image-1/original.png", new Blob(["new-image"], { type: "image/png" }))

    expect(second.size).toBe(9)
    expect(await (await store.get(first))?.text()).toBe("new-image")
  })

  test("returns null and safely deletes a missing blob", async () => {
    const store = new OpfsBlobStore({ getRoot: async () => new MemoryDirectoryHandle() })
    const ref = { store: "standalone" as const, key: "videos/missing/file.mp4", mimeType: "video/mp4", size: 1 }

    await expect(store.get(ref)).resolves.toBeNull()
    await expect(store.delete(ref)).resolves.toBeUndefined()
  })

  test("reports browser storage usage and quota", async () => {
    const store = new OpfsBlobStore({
      getRoot: async () => new MemoryDirectoryHandle(),
      estimate: async () => ({ usage: 512, quota: 4096 })
    })

    await expect(store.usage()).resolves.toEqual({ usedBytes: 512, quotaBytes: 4096 })
  })

  test("reports an actionable error when OPFS is unavailable", async () => {
    const store = new OpfsBlobStore({
      getRoot: async () => { throw new TypeError("getDirectory unavailable") }
    })

    await expect(store.put("images/image-1/original.png", new Blob(["x"]))).rejects.toMatchObject({
      detail: {
        code: "LOCAL_STORAGE_UNAVAILABLE",
        retryable: false
      }
    })
  })
})
