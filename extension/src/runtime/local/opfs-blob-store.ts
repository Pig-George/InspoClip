import type { BlobRef, BlobStore, StorageUsage } from "../contracts"
import { RuntimeFailure } from "../errors"

export interface OpfsWritable {
  write(data: Blob): Promise<void>
  close(): Promise<void>
  abort?(reason?: unknown): Promise<void>
}

export interface OpfsFileHandle {
  getFile(): Promise<File>
  createWritable(options?: { keepExistingData?: boolean }): Promise<OpfsWritable>
}

export interface OpfsDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
}

type StorageEstimate = { usage?: number; quota?: number }

type OpfsBlobStoreOptions = {
  getRoot?: () => Promise<OpfsDirectoryHandle>
  estimate?: () => Promise<StorageEstimate>
}

function defaultGetRoot(): Promise<OpfsDirectoryHandle> {
  const manager = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> }
  if (!manager?.getDirectory) return Promise.reject(new Error("OPFS is unavailable"))
  return manager.getDirectory() as unknown as Promise<OpfsDirectoryHandle>
}

function defaultEstimate(): Promise<StorageEstimate> {
  return navigator.storage.estimate()
}

function safeSegments(key: string): string[] {
  const segments = String(key || "").split("/").filter(Boolean)
  if (segments.length < 2 || segments.some((segment) => segment === "." || segment === "..")) {
    throw new RuntimeFailure({
      code: "INVALID_BLOB_KEY",
      message: "Local asset storage key is invalid",
      retryable: false
    })
  }
  return segments.map((segment) => encodeURIComponent(segment))
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "NotFoundError")
}

function storageFailure(error: unknown): RuntimeFailure {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : ""
  if (name === "QuotaExceededError") {
    return new RuntimeFailure({
      code: "LOCAL_STORAGE_FULL",
      message: "There is not enough browser storage for this asset",
      retryable: false,
      action: "free-space"
    })
  }
  return new RuntimeFailure({
    code: "LOCAL_STORAGE_UNAVAILABLE",
    message: "Browser local file storage is unavailable",
    retryable: false
  })
}

export class OpfsBlobStore implements BlobStore {
  private readonly getRoot: () => Promise<OpfsDirectoryHandle>
  private readonly estimate: () => Promise<StorageEstimate>

  constructor(options: OpfsBlobStoreOptions = {}) {
    this.getRoot = options.getRoot || defaultGetRoot
    this.estimate = options.estimate || defaultEstimate
  }

  private async resolve(key: string, create: boolean): Promise<{ directory: OpfsDirectoryHandle; filename: string }> {
    const segments = safeSegments(key)
    const filename = segments.pop() as string
    let directory: OpfsDirectoryHandle
    try {
      directory = await this.getRoot()
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment, { create })
      }
    } catch (error) {
      if (!create && isNotFound(error)) throw error
      throw storageFailure(error)
    }
    return { directory, filename }
  }

  async put(key: string, blob: Blob): Promise<BlobRef> {
    try {
      const { directory, filename } = await this.resolve(key, true)
      const handle = await directory.getFileHandle(filename, { create: true })
      const writable = await handle.createWritable({ keepExistingData: false })
      try {
        await writable.write(blob)
        await writable.close()
      } catch (error) {
        await writable.abort?.(error).catch(() => undefined)
        throw error
      }
      return {
        store: "standalone",
        key,
        mimeType: blob.type || "application/octet-stream",
        size: blob.size
      }
    } catch (error) {
      if (error instanceof RuntimeFailure) throw error
      throw storageFailure(error)
    }
  }

  async get(ref: BlobRef): Promise<Blob | null> {
    if (ref.store !== "standalone") return null
    try {
      const { directory, filename } = await this.resolve(ref.key, false)
      return await (await directory.getFileHandle(filename)).getFile()
    } catch (error) {
      if (isNotFound(error)) return null
      if (error instanceof RuntimeFailure) throw error
      throw storageFailure(error)
    }
  }

  async delete(ref: BlobRef): Promise<void> {
    if (ref.store !== "standalone") return
    try {
      const { directory, filename } = await this.resolve(ref.key, false)
      await directory.removeEntry(filename)
    } catch (error) {
      if (isNotFound(error)) return
      if (error instanceof RuntimeFailure) throw error
      throw storageFailure(error)
    }
  }

  async usage(): Promise<StorageUsage> {
    try {
      const estimate = await this.estimate()
      return {
        usedBytes: Math.max(0, Number(estimate.usage) || 0),
        ...(Number.isFinite(estimate.quota) ? { quotaBytes: Math.max(0, Number(estimate.quota)) } : {})
      }
    } catch (error) {
      throw storageFailure(error)
    }
  }
}
