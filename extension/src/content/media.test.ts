import { describe, expect, test, vi } from "vitest"

import { createObjectUrlVideoSource, revokeObjectUrlVideoSource } from "./media"

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
})
