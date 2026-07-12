import { buildClientVideoUrl, uploadVideoUrl } from "../video"
import { getAppUrl, getServerUrl } from "./settings"

export async function saveVideoFromUrl(url?: string, explicitServerUrl?: string) {
  if (!url) throw new Error("No video URL found")
  const serverUrl = explicitServerUrl || (await getServerUrl())
  return uploadVideoUrl<{ videoId: string; jobId: string; status: string }>(fetch, serverUrl, url)
}

export async function openVideoInApp(videoId: string): Promise<void> {
  const appUrl = await getAppUrl()
  await chrome.tabs.create({ url: buildClientVideoUrl(appUrl, videoId) })
}
