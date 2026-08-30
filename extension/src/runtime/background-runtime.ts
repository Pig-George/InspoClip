import { getServerUrl } from "../background/settings"
import type { ExtensionRuntime, RuntimeMode } from "./contracts"
import { RuntimeFactory, type RuntimeSettings } from "./runtime-factory"
import { loadRuntimeMode } from "./settings"

type RuntimeFactoryLike = {
  get(settings: RuntimeSettings): Promise<ExtensionRuntime>
}

type BackgroundRuntimeDependencies = {
  factory: RuntimeFactoryLike
  loadMode: () => Promise<RuntimeMode>
  loadServerUrl: () => Promise<string>
}

export function createBackgroundRuntimeProvider(dependencies: BackgroundRuntimeDependencies) {
  return async (): Promise<ExtensionRuntime> => {
    const [mode, serverUrl] = await Promise.all([
      dependencies.loadMode(),
      dependencies.loadServerUrl()
    ])
    return dependencies.factory.get({ mode, serverUrl })
  }
}

const runtimeFactory = new RuntimeFactory()

export const getBackgroundRuntime = createBackgroundRuntimeProvider({
  factory: runtimeFactory,
  loadMode: loadRuntimeMode,
  loadServerUrl: getServerUrl
})
