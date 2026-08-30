import { createAreaRecorderMessageHandler } from "./src/offscreen/area-recorder"
import { createVideoFrameExtractorMessageHandler } from "./src/offscreen/video-frame-extractor"
import { runOptionalInitialization } from "./src/background/bootstrap"
import { isDevelopmentBuild } from "./src/runtime/build-mode"
import { installExtensionErrorLogging, type ExtensionLogStorage } from "./src/runtime/extension-logger"

chrome.runtime.onMessage.addListener(createAreaRecorderMessageHandler())
chrome.runtime.onMessage.addListener(createVideoFrameExtractorMessageHandler())

// The recorder is the critical path. Optional diagnostics must not prevent
// this Offscreen document from registering its message receiver.
runOptionalInitialization(() => {
  installExtensionErrorLogging({
    source: "offscreen",
    enabled: isDevelopmentBuild,
    storage: chrome.storage.local as unknown as ExtensionLogStorage,
    captureConsole: false
  })
})
