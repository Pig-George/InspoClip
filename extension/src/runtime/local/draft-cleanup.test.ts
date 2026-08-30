import { describe, expect, test } from "vitest"

import type { Asset, AssetRepository, JobRepository } from "../contracts"
import { cleanupExpiredDrafts } from "./draft-cleanup"

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: "asset-1",
    kind: "video",
    state: "draft",
    mode: "standalone",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...overrides
  }
}

describe("cleanupExpiredDrafts", () => {
  test("removes only old drafts that are not active or result-backed", async () => {
    const deleted: string[] = []
    const assets = [
      asset({ id: "expired" }),
      asset({ id: "active" }),
      asset({ id: "result-backed", analysis: { prompt: "keep" } }),
      asset({ id: "recent", updatedAt: "2026-08-01T20:00:00.000Z" }),
      asset({ id: "saved", state: "saved" })
    ]
    const repository = {
      list: async (query: { state?: string }) => ({ items: assets.filter((item) => item.state === query.state) }),
      delete: async (id: string) => { deleted.push(id) }
    } as unknown as AssetRepository
    const jobs = {
      listActive: async () => [{ assetId: "active" }]
    } as unknown as JobRepository

    const result = await cleanupExpiredDrafts({
      assets: repository,
      jobs,
      now: () => new Date("2026-08-02T00:00:00.000Z"),
      maxAgeMs: 24 * 60 * 60 * 1000
    })

    expect(deleted).toEqual(["expired"])
    expect(result).toEqual({ scanned: 4, deleted: 1, skipped: 3 })
  })

  test("continues cleanup when one asset delete fails", async () => {
    const deleted: string[] = []
    const repository = {
      list: async () => ({ items: [asset({ id: "first" }), asset({ id: "second" })] }),
      delete: async (id: string) => {
        if (id === "first") throw new Error("blob busy")
        deleted.push(id)
      }
    } as unknown as AssetRepository

    await expect(cleanupExpiredDrafts({
      assets: repository,
      jobs: { listActive: async () => [] } as unknown as JobRepository,
      now: () => new Date("2026-08-02T00:00:00.000Z"),
      maxAgeMs: 24 * 60 * 60 * 1000
    })).resolves.toMatchObject({ scanned: 2, deleted: 1, failed: 1 })
    expect(deleted).toEqual(["second"])
  })
})
