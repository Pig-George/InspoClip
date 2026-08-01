import type { ExtensionRuntime, RuntimeMode } from "./contracts"
import { RuntimeFailure } from "./errors"
import { BackendAnalysisAdapter } from "./backend/backend-analysis-adapter"
import { BackendAssetRepository } from "./backend/backend-asset-repository"
import { BackendHttpClient, type FetchLike } from "./backend/http-client"

export type RuntimeSettings = {
  mode: RuntimeMode
  serverUrl: string
}

type RuntimeFactoryDependencies = {
  fetchFn?: FetchLike
}

function normalizeServerUrl(serverUrl: string): string {
  return String(serverUrl || "").trim().replace(/\/+$/, "")
}

export class RuntimeFactory {
  private readonly fetchFn: FetchLike
  private cacheKey = ""
  private cachedRuntime: ExtensionRuntime | null = null

  constructor(dependencies: RuntimeFactoryDependencies = {}) {
    this.fetchFn = dependencies.fetchFn || fetch
  }

  get(settings: RuntimeSettings): ExtensionRuntime {
    if (settings.mode !== "backend") {
      throw new RuntimeFailure({
        code: "STANDALONE_MODE_NOT_ENABLED",
        message: "Standalone mode is not enabled in this build",
        retryable: false
      })
    }

    const serverUrl = normalizeServerUrl(settings.serverUrl)
    const cacheKey = `${settings.mode}:${serverUrl}`
    if (this.cachedRuntime && this.cacheKey === cacheKey) return this.cachedRuntime

    const client = new BackendHttpClient(serverUrl, this.fetchFn)
    this.cachedRuntime = {
      mode: "backend",
      analysis: new BackendAnalysisAdapter(client, this.fetchFn),
      assets: new BackendAssetRepository(client)
    }
    this.cacheKey = cacheKey
    return this.cachedRuntime
  }
}
