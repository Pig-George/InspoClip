import type { AssetRepository, JobRepository } from "../contracts"

export type DraftCleanupResult = {
  scanned: number
  deleted: number
  skipped: number
  failed?: number
}

type DraftCleanupOptions = {
  assets: AssetRepository
  jobs?: JobRepository
  now?: () => Date
  maxAgeMs?: number
}

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

export async function cleanupExpiredDrafts(options: DraftCleanupOptions): Promise<DraftCleanupResult> {
  const drafts = (await options.assets.list({ state: "draft", limit: 200 })).items
  const activeAssetIds = new Set((await options.jobs?.listActive() || []).map((job) => job.assetId))
  const cutoff = (options.now || (() => new Date()))().getTime() - (options.maxAgeMs || DEFAULT_MAX_AGE_MS)
  let deleted = 0
  let skipped = 0
  let failed = 0

  for (const draft of drafts) {
    const timestamp = Date.parse(draft.updatedAt || draft.createdAt)
    if (!Number.isFinite(timestamp) || timestamp > cutoff || activeAssetIds.has(draft.id) || draft.analysis) {
      skipped += 1
      continue
    }
    try {
      await options.assets.delete(draft.id)
      deleted += 1
    } catch {
      failed += 1
    }
  }

  return { scanned: drafts.length, deleted, skipped, ...(failed ? { failed } : {}) }
}
