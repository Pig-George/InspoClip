interface VideoSourceRuntime {
  fetch?: typeof fetch
  createObjectURL?: (blob: Blob) => string
  revokeObjectURL?: (url: string) => void
}

export async function createObjectUrlVideoSource(
  remoteUrl: string,
  runtime: VideoSourceRuntime = {}
): Promise<string> {
  const fetchImpl = runtime.fetch ?? fetch
  const createObjectURL = runtime.createObjectURL ?? URL.createObjectURL.bind(URL)
  const response = await fetchImpl(remoteUrl)
  if (!response.ok) throw new Error(`Failed to load video preview: HTTP ${response.status}`)
  return createObjectURL(await response.blob())
}

export function revokeObjectUrlVideoSource(source: string | null | undefined, runtime: VideoSourceRuntime = {}): void {
  if (!source?.startsWith("blob:")) return
  const revokeObjectURL = runtime.revokeObjectURL ?? URL.revokeObjectURL.bind(URL)
  revokeObjectURL(source)
}

export async function jumpVideoToTime(
  video: Pick<HTMLVideoElement, "currentTime" | "play">,
  startTime: number
): Promise<void> {
  const safeStartTime = Number.isFinite(startTime) ? Math.max(0, startTime) : 0
  video.currentTime = safeStartTime
  try {
    await video.play()
  } catch {
    // Browser autoplay policy can reject play(); seeking is still the important action.
  }
}
