export function getTabCaptureStreamOptions(tabId: number): chrome.tabCapture.GetMediaStreamOptions {
  return {
    targetTabId: tabId
  }
}

type PrepareTabCaptureMessage = {
  type: "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE"
  sourceId: string
  streamId: string
}

type PrepareTabCaptureDependencies<T> = {
  getStreamId(options: chrome.tabCapture.GetMediaStreamOptions): Promise<string>
  ensureOffscreenDocument(): Promise<void>
  sendOffscreenMessage(message: PrepareTabCaptureMessage): Promise<T>
}

type AreaCaptureMode = "analyze" | "save"

type AreaCaptureMessage = {
  type: "START_AREA_CAPTURE"
  mode: AreaCaptureMode
  recordingSourceId?: string
}

type OpenAreaCaptureDependencies = {
  sendContentMessage(tabId: number, message: Pick<AreaCaptureMessage, "type" | "mode">): Promise<unknown>
}

type StartAreaCaptureDependencies = {
  createSourceId(): string
  prepareSource(tabId: number, sourceId: string): Promise<unknown>
  sendContentMessage(tabId: number, message: AreaCaptureMessage): Promise<unknown>
  releaseSource(sourceId: string): Promise<unknown>
}

export async function prepareTabCaptureSource<T>(
  tabId: number,
  sourceId: string,
  dependencies: PrepareTabCaptureDependencies<T>
): Promise<T> {
  const streamId = await dependencies.getStreamId(getTabCaptureStreamOptions(tabId))
  await dependencies.ensureOffscreenDocument()
  return dependencies.sendOffscreenMessage({
    type: "PREPARE_OFFSCREEN_AREA_RECORDING_SOURCE",
    sourceId,
    streamId
  })
}

export async function startAreaCaptureWithPreparedSource(
  tabId: number,
  mode: AreaCaptureMode,
  dependencies: StartAreaCaptureDependencies
): Promise<void> {
  const sourceId = dependencies.createSourceId()
  await dependencies.prepareSource(tabId, sourceId)

  try {
    await dependencies.sendContentMessage(tabId, {
      type: "START_AREA_CAPTURE",
      mode,
      recordingSourceId: sourceId
    })
  } catch (error) {
    await dependencies.releaseSource(sourceId).catch(() => undefined)
    throw error
  }
}

export async function openAreaCaptureSelector(
  tabId: number,
  mode: AreaCaptureMode,
  dependencies: OpenAreaCaptureDependencies
): Promise<void> {
  await dependencies.sendContentMessage(tabId, { type: "START_AREA_CAPTURE", mode })
}

export function getOffscreenDocumentOptions(url: string): chrome.offscreen.CreateParameters {
  return {
    url,
    reasons: ["USER_MEDIA", "BLOBS"],
    justification: "Record, crop, and decode local video for InspoClip analysis"
  }
}

export function getExtensionRelativeUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/+/, "")
  } catch {
    return url.replace(/^\/+/, "")
  }
}

export function normalizeTabCaptureErrorMessage(message: string | undefined): string {
  if (message?.includes("Extension has not been invoked")) {
    return "Recording permission expired. Please start area recording from the InspoClip extension button or shortcut again."
  }

  return message || "Failed to start tab capture"
}
