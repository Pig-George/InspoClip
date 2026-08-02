import type { ExtensionRuntime, RuntimeMode } from "./contracts"
import { BackendAnalysisAdapter } from "./backend/backend-analysis-adapter"
import { BackendAssetRepository } from "./backend/backend-asset-repository"
import { BackendHttpClient, type FetchLike } from "./backend/http-client"
import { createStandaloneRuntime as createDefaultStandaloneRuntime } from "./local/standalone-runtime"

export type RuntimeSettings = {
  mode: RuntimeMode
  serverUrl: string
}

type RuntimeFactoryDependencies = {
  fetchFn?: FetchLike
  createStandaloneRuntime?: () => Promise<ExtensionRuntime>
}

function normalizeServerUrl(serverUrl: string): string {
  return String(serverUrl || "").trim().replace(/\/+$/, "")
}

export class RuntimeFactory {
  private readonly fetchFn: FetchLike
  private readonly createStandaloneRuntime: () => Promise<ExtensionRuntime>
  private readonly runtimes = new Map<string, Promise<ExtensionRuntime>>()

  constructor(dependencies: RuntimeFactoryDependencies = {}) {
    this.fetchFn = dependencies.fetchFn || fetch
    this.createStandaloneRuntime = dependencies.createStandaloneRuntime || createDefaultStandaloneRuntime
  }

  async get(settings: RuntimeSettings): Promise<ExtensionRuntime> {
    const serverUrl = normalizeServerUrl(settings.serverUrl)
    const cacheKey = settings.mode === "standalone" ? "standalone" : `backend:${serverUrl}`
    const existing = this.runtimes.get(cacheKey)
    if (existing) return existing

    const created = settings.mode === "standalone"
      ? this.createStandaloneRuntime()
      : Promise.resolve(this.createBackendRuntime(serverUrl))
    this.runtimes.set(cacheKey, created)
    try {
      return await created
    } catch (error) {
      this.runtimes.delete(cacheKey)
      throw error
    }
  }

  private createBackendRuntime(serverUrl: string): ExtensionRuntime {
    const client = new BackendHttpClient(serverUrl, this.fetchFn, { allowLoopbackFallback: true })
    return {
      mode: "backend",
      analysis: new BackendAnalysisAdapter(client, this.fetchFn),
      assets: new BackendAssetRepository(client)
    }
  }
}
