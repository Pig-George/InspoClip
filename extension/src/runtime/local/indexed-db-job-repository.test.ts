import { IDBFactory } from "fake-indexeddb"
import { afterEach, describe, expect, test } from "vitest"

import type { AnalysisJob } from "../contracts"
import { openInspoClipDb } from "./indexed-db"
import { IndexedDbJobRepository } from "./indexed-db-job-repository"

const openDatabases: IDBDatabase[] = []

afterEach(() => openDatabases.splice(0).forEach((database) => database.close()))

function job(id: string, status: AnalysisJob["status"]): AnalysisJob {
  return {
    id,
    assetId: `asset-${id}`,
    assetKind: id.includes("video") ? "video" : "image",
    mode: "standalone",
    status,
    progress: 35,
    provider: "gemini",
    model: "gemini-video",
    retryCount: 2,
    nextRetryAt: "2026-08-01T01:00:00.000Z",
    remoteFileId: "remote-file",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:01:00.000Z"
  }
}

describe("IndexedDbJobRepository", () => {
  test("persists recoverable job fields and lists only active jobs", async () => {
    const database = await openInspoClipDb(new IDBFactory(), `test-jobs-${crypto.randomUUID()}`)
    openDatabases.push(database)
    const repository = new IndexedDbJobRepository(database)
    await repository.put(job("video-1", "processing"))
    await repository.put(job("image-1", "queued"))
    await repository.put(job("video-2", "completed"))
    await repository.put(job("video-3", "failed"))

    await expect(repository.get("video-1")).resolves.toMatchObject({
      provider: "gemini",
      retryCount: 2,
      remoteFileId: "remote-file"
    })
    await expect(repository.listActive()).resolves.toHaveLength(2)
  })

  test("replaces and removes jobs", async () => {
    const database = await openInspoClipDb(new IDBFactory(), `test-jobs-${crypto.randomUUID()}`)
    openDatabases.push(database)
    const repository = new IndexedDbJobRepository(database)
    await repository.put(job("video-1", "processing"))
    await repository.put({ ...job("video-1", "completed"), progress: 100 })

    await expect(repository.get("video-1")).resolves.toMatchObject({ status: "completed", progress: 100 })
    await repository.remove("video-1")
    await expect(repository.get("video-1")).resolves.toBeNull()
  })

  test("creates the required object stores and indexes", async () => {
    const database = await openInspoClipDb(new IDBFactory(), `test-schema-${crypto.randomUUID()}`)
    openDatabases.push(database)

    expect(Array.from(database.objectStoreNames)).toEqual(["assets", "jobs"])
    const assets = database.transaction("assets").objectStore("assets")
    const jobs = database.transaction("jobs").objectStore("jobs")
    expect(Array.from(assets.indexNames)).toEqual(["kind", "state", "updatedAt"])
    expect(Array.from(jobs.indexNames)).toEqual(["status", "updatedAt"])
  })
})
