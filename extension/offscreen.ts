import { createAreaRecorderMessageHandler } from "./src/offscreen/area-recorder"

chrome.runtime.onMessage.addListener(createAreaRecorderMessageHandler())
