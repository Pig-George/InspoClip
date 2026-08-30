import { describe, expect, test } from "vitest"

import { normalizeBackendUrl } from "./backend-url"

describe("normalizeBackendUrl", () => {
  test("uses the IPv4 loopback address for the local Docker backend", () => {
    expect(normalizeBackendUrl("http://localhost:3001/")).toBe("http://127.0.0.1:3001")
  })

  test("preserves a configured remote backend address", () => {
    expect(normalizeBackendUrl("https://inspo.example.com/api/")).toBe("https://inspo.example.com/api")
  })
})
