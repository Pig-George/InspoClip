import { describe, expect, test } from "vitest"

import { BackendAssetRepository } from "./backend-asset-repository"
import { BackendHttpClient, type FetchLike } from "./http-client"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })
}

describe("BackendAssetRepository", () => {
  test("gets a week and saves a screenshot at its day placement", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([String(url), init])
      if (String(url).includes("/api/weeks/")) return jsonResponse({ week: { id: "week-1" } })
      return jsonResponse({ id: "image-1", filePath: "image.jpg" })
    }
    const repository = new BackendAssetRepository(new BackendHttpClient("http://localhost:3001/", fetchFn))

    const week = await repository.getWeek("2026-07-27")
    const image = await repository.saveImageBlob<{ id: string }>(
      new Blob(["image"], { type: "image/jpeg" }),
      "screenshot.jpg",
      week.week.id,
      4
    )

    expect(image.id).toBe("image-1")
    expect(calls[0][0]).toBe("http://localhost:3001/api/weeks/2026-07-27")
    expect(calls[1][0]).toBe("http://localhost:3001/api/images")
    const form = calls[1][1]?.body as FormData
    expect(form.get("weekId")).toBe("week-1")
    expect(form.get("dayOfWeek")).toBe("4")
  })

  test("saves a video draft and gets its detail", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn: FetchLike = async (url, init) => {
      calls.push([String(url), init])
      if (init?.method === "POST") return jsonResponse({ video: { id: "video-1", isSaved: true } })
      return jsonResponse({ video: { id: "video-1" }, analysis: { summary: "demo" } })
    }
    const repository = new BackendAssetRepository(new BackendHttpClient("http://localhost:3001", fetchFn))

    await expect(repository.saveVideo("video-1")).resolves.toEqual({ video: { id: "video-1", isSaved: true } })
    await expect(repository.getVideoDetail("video-1")).resolves.toMatchObject({ video: { id: "video-1" } })
    expect(calls.map(([url]) => url)).toEqual([
      "http://localhost:3001/api/videos/video-1/save",
      "http://localhost:3001/api/videos/video-1"
    ])
  })

  test("builds backend content URLs without fetching the media", () => {
    const repository = new BackendAssetRepository(new BackendHttpClient("http://localhost:3001/", fetch))

    expect(repository.getImageContentUrl("folder/demo image.png")).toBe(
      "http://localhost:3001/api/uploads/folder%2Fdemo%20image.png"
    )
    expect(repository.getVideoContentUrl("video-1")).toBe(
      "http://localhost:3001/api/videos/video-1/content"
    )
  })
})
