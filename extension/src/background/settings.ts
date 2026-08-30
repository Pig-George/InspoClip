import { DEFAULT_SERVER_URL } from "./constants"
import { normalizeBackendUrl } from "../runtime/backend-url"

export async function getServerUrl(): Promise<string> {
  const result = await chrome.storage.sync.get(["serverUrl"])
  return normalizeBackendUrl(result.serverUrl || DEFAULT_SERVER_URL)
}

export async function getAppUrl(): Promise<string> {
  const settings = await chrome.storage.sync.get(["appUrl"])
  return settings.appUrl || (await getServerUrl()).replace(/:3001$/, ":8080")
}
