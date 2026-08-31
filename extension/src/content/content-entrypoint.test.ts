import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const source = readFileSync(new URL("../../contents/inspoclip.ts", import.meta.url), "utf8")

describe("content entrypoint runtime boundaries", () => {
  test("regenerates image prompts through the runtime adapter", () => {
    expect(source).toContain("regenerateImagePromptWithRuntime(sourceBlob")
    expect(source).not.toContain("fetch(`${serverUrl}/api/images/analyze`")
  })
})
