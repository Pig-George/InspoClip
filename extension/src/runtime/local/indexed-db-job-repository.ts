import type { AnalysisJob, JobRepository } from "../contracts"
import { requestToPromise, transactionDone } from "./indexed-db"

const ACTIVE_STATUSES = new Set<AnalysisJob["status"]>(["queued", "uploading", "processing"])

export class IndexedDbJobRepository implements JobRepository {
  constructor(private readonly database: IDBDatabase) {}

  async put(job: AnalysisJob): Promise<void> {
    const transaction = this.database.transaction("jobs", "readwrite")
    transaction.objectStore("jobs").put(structuredClone(job))
    await transactionDone(transaction)
  }

  async get(jobId: string): Promise<AnalysisJob | null> {
    const transaction = this.database.transaction("jobs", "readonly")
    const value = await requestToPromise(transaction.objectStore("jobs").get(jobId))
    await transactionDone(transaction)
    return (value as AnalysisJob | undefined) || null
  }

  async listActive(): Promise<AnalysisJob[]> {
    const transaction = this.database.transaction("jobs", "readonly")
    const values = await requestToPromise(transaction.objectStore("jobs").getAll()) as AnalysisJob[]
    await transactionDone(transaction)
    return values
      .filter((job) => ACTIVE_STATUSES.has(job.status))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async remove(jobId: string): Promise<void> {
    const transaction = this.database.transaction("jobs", "readwrite")
    transaction.objectStore("jobs").delete(jobId)
    await transactionDone(transaction)
  }
}
