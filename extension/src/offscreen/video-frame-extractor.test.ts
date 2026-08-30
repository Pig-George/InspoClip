import { describe, expect, test } from "vitest"

import { createVideoSampleTimes, resolveVideoDuration } from "./video-frame-extractor"

describe("createVideoSampleTimes", () => {
  test("keeps the first and last frame while sampling uniformly", () => {
    expect(createVideoSampleTimes(10, 5)).toEqual([0, 2.5, 5, 7.5, 9.95])
  })

  test("clamps the configured frame count to the supported range", () => {
    expect(createVideoSampleTimes(2, 1)).toHaveLength(4)
    expect(createVideoSampleTimes(10, 100)).toHaveLength(48)
  })
})

describe("resolveVideoDuration", () => {
  test("uses the recorded duration when WebM metadata is unavailable", () => {
    expect(resolveVideoDuration(Number.POSITIVE_INFINITY, 10.25)).toBe(10.25)
    expect(resolveVideoDuration(Number.NaN, 10.25)).toBe(10.25)
  })

  test("prefers a finite media duration and then seekable duration", () => {
    expect(resolveVideoDuration(9.8, 10.25, 10.1)).toBe(9.8)
    expect(resolveVideoDuration(Number.POSITIVE_INFINITY, 10.25, 10.1)).toBe(10.1)
  })
})
