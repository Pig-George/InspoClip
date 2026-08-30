import { describe, expect, test, vi } from "vitest"

import type { Asset, Page } from "../runtime/contracts"
import { loadAllSavedAssets } from "./workspace-data"

const asset = (id: string): Asset => ({
  id,
  kind: "image",
  state: "saved",
  mode: "standalone",
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z"
})

describe("workspace data", () => {
  test("loads every saved asset page until the cursor is exhausted", async () => {
    const requestPage = vi.fn(async (cursor?: string): Promise<Page<Asset>> => cursor
      ? { items: [asset("third")] }
      : { items: [asset("first"), asset("second")], nextCursor: "2" })

    await expect(loadAllSavedAssets(requestPage)).resolves.toMatchObject([
      { id: "first" }, { id: "second" }, { id: "third" }
    ])
    expect(requestPage).toHaveBeenNthCalledWith(1, undefined)
    expect(requestPage).toHaveBeenNthCalledWith(2, "2")
  })
})
