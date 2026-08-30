import {
  clearExtensionLogs,
  createExtensionLogRecorder,
  EXTENSION_LOGS_KEY,
  loadExtensionLogs,
  LEGACY_BACKEND_DIAGNOSTICS_KEY,
  type ExtensionLogStorage
} from "../extension-logger"

/** @deprecated Use the unified extension logger instead. Kept for compatibility with older integrations. */
export const BACKEND_DIAGNOSTICS_KEY = LEGACY_BACKEND_DIAGNOSTICS_KEY
export type DiagnosticStorage = ExtensionLogStorage

export type BackendRequestFailureDiagnostic = {
  url: string
  method: string
  error: unknown
}

export type BackendDiagnostic = {
  timestamp: string
  url: string
  method: string
  error: string
}

export function createBackendDiagnosticRecorder(
  storage: DiagnosticStorage,
  enabled: boolean,
  now?: () => string
): (diagnostic: BackendRequestFailureDiagnostic) => Promise<void> {
  const record = createExtensionLogRecorder(storage, enabled, now)
  return async ({ url, method, error }) => {
    await record({
      source: "backend",
      level: "error",
      error,
      context: { url, method }
    })
    if (enabled) {
      const logs = await loadExtensionLogs(storage, true)
      await storage.set({ [EXTENSION_LOGS_KEY]: logs.slice(0, 20) })
    }
  }
}

export async function loadBackendDiagnostics(storage: DiagnosticStorage, enabled: boolean): Promise<BackendDiagnostic[]> {
  if (!enabled) return []
  const logs = await loadExtensionLogs(storage, true)
  return logs
    .filter((entry) => entry.source === "backend" && entry.context?.url && entry.context?.method)
    .slice(0, 20)
    .map((entry) => ({
      timestamp: entry.timestamp,
      url: String(entry.context?.url),
      method: String(entry.context?.method),
      error: entry.message
    }))
}

export function clearBackendDiagnostics(storage: DiagnosticStorage, enabled: boolean): Promise<void> {
  return clearExtensionLogs(storage, enabled)
}
