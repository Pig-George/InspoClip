import { isDevelopmentBuild } from "../../runtime/build-mode"
import {
  clearExtensionLogs,
  createExtensionLogRecorder,
  installExtensionErrorLogging,
  loadExtensionLogs,
  type ExtensionLogEntry,
  type ExtensionLogStorage
} from "../../runtime/extension-logger"

function localStorage(): ExtensionLogStorage {
  return chrome.storage.local as unknown as ExtensionLogStorage
}

const storage = localStorage()

export const recordPopupLog = createExtensionLogRecorder(storage, isDevelopmentBuild)

export function loadPopupExtensionLogs(): Promise<ExtensionLogEntry[]> {
  return loadExtensionLogs(storage, isDevelopmentBuild)
}

export function clearPopupExtensionLogs(): Promise<void> {
  return clearExtensionLogs(storage, isDevelopmentBuild)
}

export function installPopupErrorLogging() {
  return installExtensionErrorLogging({
    source: "popup",
    enabled: isDevelopmentBuild,
    storage
  })
}
