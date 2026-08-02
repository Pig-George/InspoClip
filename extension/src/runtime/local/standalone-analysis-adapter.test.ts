import { describe, expect, test } from "vitest"

import { StandaloneAnalysisAdapter } from "./standalone-analysis-adapter"

describe("StandaloneAnalysisAdapter", () => {
  test("never falls back to the backend when a local model is not configured", async () => {
    const adapter = new StandaloneAnalysisAdapter()

    await expect(adapter.analyzeImage({
      blob: new Blob(["image"]),
      filename: "image.png",
      mimeType: "image/png"
    })).rejects.toMatchObject({
      detail: {
        code: "MODEL_CONFIGURATION_REQUIRED",
        retryable: false,
        action: "open-settings"
      }
    })
    await expect(adapter.analyzeVideo({
      blob: new Blob(["video"]),
      filename: "video.mp4",
      mimeType: "video/mp4"
    })).rejects.toMatchObject({ detail: { code: "MODEL_CONFIGURATION_REQUIRED" } })
  })
})
