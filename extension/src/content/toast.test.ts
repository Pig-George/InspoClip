import { describe, expect, test } from "vitest"

import { getToastIconMarkup, syncToastElement } from "./toast"

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

  test("renders spinner markup for loading toasts", () => {
    expect(getToastIconMarkup("loading")).toContain("inspoclip-spinner")
  })
})
