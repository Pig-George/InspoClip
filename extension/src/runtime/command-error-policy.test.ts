import { describe, expect, test } from "vitest"

import { shouldRecordRuntimeCommandFailure } from "./command-error-policy"

describe("runtime command error policy", () => {
  test("does not record expected local cache and content URL fallbacks", () => {
    expect(shouldRecordRuntimeCommandFailure("runtime.prompt.generate", { code: "LOCAL_PROMPT_NOT_FOUND" }, { regenerate: false })).toBe(false)
    expect(shouldRecordRuntimeCommandFailure("runtime.asset.content.url", { code: "LOCAL_CONTENT_URL_UNAVAILABLE" })).toBe(false)
  })

  test("records actionable runtime failures", () => {
    expect(shouldRecordRuntimeCommandFailure("runtime.prompt.generate", { code: "LOCAL_MODEL_INVALID_PROMPT" }, { regenerate: true })).toBe(true)
    expect(shouldRecordRuntimeCommandFailure("runtime.prompt.generate", { code: "LOCAL_PROMPT_NOT_FOUND" }, { regenerate: true })).toBe(true)
    expect(shouldRecordRuntimeCommandFailure("runtime.analysis.video.start", { code: "LOCAL_VIDEO_FRAME_EXTRACTION_FAILED" })).toBe(true)
  })
})
