import { RuntimeFailure } from "../errors"

export const LOCAL_DATABASE_NAME = "inspoclip-local"
export const LOCAL_DATABASE_VERSION = 1

function databaseFailure(error: unknown): RuntimeFailure {
  const message = error instanceof Error && error.message
    ? `Local database is unavailable: ${error.message}`
    : "Local database is unavailable"
  return new RuntimeFailure({
    code: "LOCAL_DATABASE_UNAVAILABLE",
    message,
    retryable: false
  })
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || databaseFailure(undefined))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || databaseFailure(undefined))
    transaction.onerror = () => reject(transaction.error || databaseFailure(undefined))
  })
}

export function openInspoClipDb(
  factory: IDBFactory = indexedDB,
  databaseName = LOCAL_DATABASE_NAME
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest
    try {
      request = factory.open(databaseName, LOCAL_DATABASE_VERSION)
    } catch (error) {
      reject(databaseFailure(error))
      return
    }

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains("assets")) {
        const assets = database.createObjectStore("assets", { keyPath: "id" })
        assets.createIndex("kind", "kind", { unique: false })
        assets.createIndex("state", "state", { unique: false })
        assets.createIndex("updatedAt", "updatedAt", { unique: false })
      }
      if (!database.objectStoreNames.contains("jobs")) {
        const jobs = database.createObjectStore("jobs", { keyPath: "id" })
        jobs.createIndex("status", "status", { unique: false })
        jobs.createIndex("updatedAt", "updatedAt", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(databaseFailure(request.error))
    request.onblocked = () => reject(new RuntimeFailure({
      code: "LOCAL_DATABASE_BLOCKED",
      message: "Local database upgrade is blocked by another InspoClip page",
      retryable: true,
      action: "retry"
    }))
  })
}
