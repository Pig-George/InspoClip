import type { BlobStore, ExtensionRuntime } from "../contracts"
import { openInspoClipDb, LOCAL_DATABASE_NAME } from "./indexed-db"
import { IndexedDbAssetRepository } from "./indexed-db-asset-repository"
import { IndexedDbJobRepository } from "./indexed-db-job-repository"
import { OpfsBlobStore } from "./opfs-blob-store"
import { StandaloneAnalysisAdapter } from "./standalone-analysis-adapter"

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
  return {
    mode: "standalone",
    assets: new IndexedDbAssetRepository(database, blobs),
    analysis: new StandaloneAnalysisAdapter(),
    jobs: new IndexedDbJobRepository(database),
    blobs
  }
}
