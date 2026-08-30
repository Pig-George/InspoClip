import { buildClientVideoUrl } from "../video"
import { getBackgroundRuntime } from "../runtime/background-runtime"
import { getAppUrl } from "./settings"

export async function saveVideoFromUrl(url?: string, options?: { draft?: boolean }) {
  if (!url) throw new Error("No video URL found")
  const runtime = await getBackgroundRuntime()
  const job = await runtime.analysis.analyzeVideoUrl(url, options)
  return (job.result || { videoId: job.assetId, jobId: job.id, status: job.status }) as {
    videoId: string
    jobId: string
    status: string
  }
}

export async function openVideoInApp(videoId: string): Promise<void> {
  const appUrl = await getAppUrl()
  await chrome.tabs.create({ url: buildClientVideoUrl(appUrl, videoId) })
}
