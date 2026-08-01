import type { RuntimeMode } from "./contracts"

export const RUNTIME_MODE_KEY = "runtimeMode"

export interface StorageAreaLike {
  get(keys: string | string[]): Promise<Record<string, unknown>>
  set(values: Record<string, unknown>): Promise<void>
}

function localStorageArea(): StorageAreaLike {
  return chrome.storage.local as unknown as StorageAreaLike
}

function isRuntimeMode(value: unknown): value is RuntimeMode {
  return value === "backend" || value === "standalone"
}

export async function loadRuntimeMode(storage: StorageAreaLike = localStorageArea()): Promise<RuntimeMode> {
  const result = await storage.get([RUNTIME_MODE_KEY])
  return isRuntimeMode(result[RUNTIME_MODE_KEY]) ? result[RUNTIME_MODE_KEY] : "backend"
}

export async function saveRuntimeMode(mode: RuntimeMode, storage: StorageAreaLike = localStorageArea()): Promise<void> {
  await storage.set({ [RUNTIME_MODE_KEY]: mode })
}

export async function initializeRuntimeMode(
  reason: chrome.runtime.OnInstalledReason | string,
  storage: StorageAreaLike = localStorageArea()
): Promise<RuntimeMode> {
  const result = await storage.get([RUNTIME_MODE_KEY])
  if (isRuntimeMode(result[RUNTIME_MODE_KEY])) return result[RUNTIME_MODE_KEY]
  const mode: RuntimeMode = reason === "install" ? "standalone" : "backend"
  await saveRuntimeMode(mode, storage)
  return mode
}
