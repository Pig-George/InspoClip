import { describe, expect, test } from "vitest"

import { BackendHttpClient } from "./http-client"
import { toRuntimeError } from "../errors"

describe("BackendHttpClient", () => {
  test("normalizes the base URL and returns JSON", async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    const fetchFn = (async (url: string, init?: RequestInit) => {
      calls.push([url, init])
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }) as typeof fetch
    const client = new BackendHttpClient("http://localhost:3001///", fetchFn)

    await expect(client.request<{ ok: boolean }>("api/health")).resolves.toEqual({ ok: true })
    expect(calls[0][0]).toBe("http://localhost:3001/api/health")
  })

  test("accepts a successful response without a body", async () => {
    const client = new BackendHttpClient("http://localhost:3001", async () => new Response(null, { status: 204 }))

    await expect(client.request("/api/videos/1", { method: "DELETE" })).resolves.toBeUndefined()
  })

  test("turns a JSON backend error into a structured runtime failure", async () => {
    const client = new BackendHttpClient("http://localhost:3001", async () => new Response(
      JSON.stringify({ error: "Invalid API key" }),
      { status: 401, headers: { "content-type": "application/json" } }
    ))

    await expect(client.request("/api/images/analyze", {
      headers: { Authorization: "Bearer sk-secret" }
    })).rejects.toMatchObject({
      detail: {
        code: "BACKEND_HTTP_401",
        message: "Invalid API key",
        retryable: false,
        action: "open-settings"
      }
    })
  })

  test("uses a safe message for non-JSON server errors", async () => {
    const client = new BackendHttpClient("http://localhost:3001", async () => new Response(
      "upstream stack containing sk-secret",
      { status: 502, headers: { "content-type": "text/plain" } }
    ))

    await expect(client.request("/api/video-jobs/1")).rejects.toMatchObject({
      detail: {
        code: "BACKEND_HTTP_502",
        message: "Backend request failed with HTTP 502",
        retryable: true
      }
    })
  })

  test("normalizes fetch failures as retryable network errors", async () => {
    const client = new BackendHttpClient("http://localhost:3001", async () => {
      throw new TypeError("fetch failed")
    })

    try {
      await client.request("/api/health")
      throw new Error("Expected request to fail")
    } catch (error) {
      expect(toRuntimeError(error)).toEqual({
        code: "NETWORK_ERROR",
        message: "Unable to reach the InspoClip backend",
        retryable: true,
        action: "retry"
      })
      expect(JSON.stringify(toRuntimeError(error))).not.toContain("sk-secret")
    }
  })

  test("falls back from localhost to IPv4 loopback for Docker-bound services", async () => {
    const calls: string[] = []
    const client = new BackendHttpClient("http://localhost:3001", async (url) => {
      calls.push(String(url))
      if (calls.length === 1) throw new TypeError("Failed to fetch")
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    }, { allowLoopbackFallback: true })

    await expect(client.request<{ ok: boolean }>("/api/health")).resolves.toEqual({ ok: true })
    expect(calls).toEqual([
      "http://localhost:3001/api/health",
      "http://127.0.0.1:3001/api/health"
    ])
  })
})
