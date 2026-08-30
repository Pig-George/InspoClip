import { describe, expect, test, vi } from "vitest"

import { uploadBailianTemporaryFile } from "./bailian-temporary-file"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  })
}

describe("uploadBailianTemporaryFile", () => {
  test("gets a model-bound upload policy and returns an oss URL", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (calls.length === 1) {
        return jsonResponse({
          data: {
            policy: "policy",
            signature: "signature",
            upload_dir: "dashscope-instant/account/job",
            upload_host: "https://dashscope-file.oss-cn-beijing.aliyuncs.com",
            max_file_size_mb: "100",
            oss_access_key_id: "temporary-access-key",
            x_oss_object_acl: "private",
            x_oss_forbid_overwrite: "true"
          }
        })
      }
      return new Response(null, { status: 200 })
    })

    await expect(uploadBailianTemporaryFile({
      apiKey: "secret",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-vl-plus",
      blob: new Blob(["video"], { type: "video/mp4" }),
      filename: "demo.mp4",
      fetchFn
    })).resolves.toBe("oss://dashscope-instant/account/job/demo.mp4")

    expect(calls[0].url).toBe("https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=qwen-vl-plus")
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe("Bearer secret")
    const form = calls[1].init?.body as FormData
    expect(calls[1].url).toBe("https://dashscope-file.oss-cn-beijing.aliyuncs.com")
    expect(Array.from(form.keys()).at(-1)).toBe("file")
    expect(form.get("key")).toBe("dashscope-instant/account/job/demo.mp4")
  })

  test("rejects a video larger than the model-specific policy limit", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      data: {
        policy: "policy",
        signature: "signature",
        upload_dir: "dir",
        upload_host: "https://upload.example.com",
        max_file_size_mb: "0.000001",
        oss_access_key_id: "key",
        x_oss_object_acl: "private",
        x_oss_forbid_overwrite: "true"
      }
    }))

    await expect(uploadBailianTemporaryFile({
      apiKey: "secret",
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen-vl-plus",
      blob: new Blob(["video"]),
      filename: "demo.mp4",
      fetchFn
    })).rejects.toMatchObject({ detail: { code: "BAILIAN_TEMP_FILE_TOO_LARGE" } })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
