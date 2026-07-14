export function getTabCaptureStreamOptions(tabId: number): chrome.tabCapture.GetMediaStreamOptions {
  return {
    targetTabId: tabId
  }
}

export function getOffscreenDocumentOptions(url: string): chrome.offscreen.CreateParameters {
  return {
    url,
    reasons: ["USER_MEDIA"],
    justification: "Record and crop the active tab area for InspoClip video analysis"
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
