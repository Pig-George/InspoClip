import { describe, expect, test } from "vitest"

import { getToastIconMarkup, getToastProgress, syncToastElement } from "./toast"

describe("content toast helpers", () => {
  test("updates an existing toast element without replacing the element", () => {
    const icon = { innerHTML: "" }
    const text = { textContent: "" }
    const toast: {
      className: string
      dataset: Record<string, string>
      querySelector: (selector: string) => { innerHTML?: string; textContent?: string | null } | null
    } = {
      className: "inspoclip-toast inspoclip-toast-loading inspoclip-toast-visible",
      dataset: {},
      querySelector: (selector: string) => {
        if (selector === ".inspoclip-toast-icon") return icon
        if (selector === ".inspoclip-toast-text") return text
        return null
      }
    }

    syncToastElement(toast, "Uploading 50%", "loading")
    syncToastElement(toast, "Saved", "success")

    expect(toast.className).toBe("inspoclip-toast inspoclip-toast-success")
    expect(toast.dataset.type).toBe("success")
    expect(text.textContent).toBe("Saved")
    expect(icon.innerHTML).toBe("✓")
  })

  test("extracts and clamps percentage progress from loading messages", () => {
    expect(getToastProgress("Understanding video... 42%")).toBe(42)
    expect(getToastProgress("正在理解视频... 125%")).toBe(100)
    expect(getToastProgress("Analyzing...")).toBeNull()
  })

  test("renders circular progress markup for loading toasts", () => {
    const indeterminate = getToastIconMarkup("loading", "Analyzing...")
    const determinate = getToastIconMarkup("loading", "Understanding video... 42%")

    expect(indeterminate).toContain("inspoclip-progress-ring-indeterminate")
    expect(determinate).toContain("inspoclip-progress-ring-determinate")
    expect(determinate).toContain("--inspoclip-toast-progress: 42")
    expect(indeterminate).not.toContain("inspoclip-spinner")
  })
})
