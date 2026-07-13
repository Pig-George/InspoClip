import { describe, expect, test, vi } from "vitest"

import { createObjectUrlVideoSource, jumpVideoToTime, revokeObjectUrlVideoSource } from "./media"

describe("content media helpers", () => {
  test("loads remote video content as a blob URL for CSP-restricted pages", async () => {
    const createObjectURL = vi.fn(() => "blob:https://example.com/video")
    const fetchImpl = vi.fn(async () => new Response(new Blob(["video"], { type: "video/mp4" })))

    const source = await createObjectUrlVideoSource("http://localhost:3001/api/videos/video-id/content", {
      fetch: fetchImpl,
      createObjectURL
    })

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:3001/api/videos/video-id/content")
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(source).toBe("blob:https://example.com/video")
  })

  test("revokes generated blob video sources", () => {
    const revokeObjectURL = vi.fn()

    revokeObjectUrlVideoSource("blob:https://example.com/video", { revokeObjectURL })

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:https://example.com/video")
  })

  test("does not try to revoke non-blob video sources", () => {
    const revokeObjectURL = vi.fn()

    revokeObjectUrlVideoSource("http://localhost:3001/api/videos/video-id/content", { revokeObjectURL })

    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  test("jumps a video element to the selected stage start time and plays it", async () => {
    const video = {
      currentTime: 0,
      play: vi.fn(async () => undefined)
    }

    await jumpVideoToTime(video, 12.5)

    expect(video.currentTime).toBe(12.5)
    expect(video.play).toHaveBeenCalled()
  })

  test("still jumps when play is blocked by browser autoplay policy", async () => {
    const video = {
      currentTime: 0,
      play: vi.fn(async () => {
        throw new Error("NotAllowedError")
      })
    }

    await expect(jumpVideoToTime(video, 8)).resolves.toBeUndefined()
    expect(video.currentTime).toBe(8)
  })
})
