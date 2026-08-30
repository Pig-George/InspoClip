import type { BlobStore, ExtensionRuntime } from "../contracts"
import { openInspoClipDb, LOCAL_DATABASE_NAME } from "./indexed-db"
import { IndexedDbAssetRepository } from "./indexed-db-asset-repository"
import { IndexedDbJobRepository } from "./indexed-db-job-repository"
import { OpfsBlobStore } from "./opfs-blob-store"
import { StandaloneAnalysisAdapter } from "./standalone-analysis-adapter"
import { cleanupExpiredDrafts } from "./draft-cleanup"

type StandaloneRuntimeOptions = {
  indexedDb?: IDBFactory
  databaseName?: string
  blobs?: BlobStore
  onDatabaseOpen?: (database: IDBDatabase) => void
}

export async function createStandaloneRuntime(options: StandaloneRuntimeOptions = {}): Promise<ExtensionRuntime> {
  const database = await openInspoClipDb(options.indexedDb || indexedDB, options.databaseName || LOCAL_DATABASE_NAME)
  options.onDatabaseOpen?.(database)
  const blobs = options.blobs || new OpfsBlobStore()
  const jobs = new IndexedDbJobRepository(database)
  const assets = new IndexedDbAssetRepository(database, blobs)
  await cleanupExpiredDrafts({ assets, jobs }).catch(() => undefined)
  return {
    mode: "standalone",
    assets,
    analysis: new StandaloneAnalysisAdapter({ assets, jobs, blobs }),
    jobs,
    blobs
  }
}
