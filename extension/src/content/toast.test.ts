import { describe, expect, test } from "vitest"

import {
  getToastIconMarkup,
  getToastProgress,
  getToastProgressStrokeOffset,
  getToastTextMarkup,
  syncToastElement
} from "./toast"

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

  test("preserves visibility when updating a concurrent progress toast", () => {
    const icon = { innerHTML: "", querySelector: () => null }
    const text = { innerHTML: "" }
    const toast = {
      className: "inspoclip-toast inspoclip-toast-loading inspoclip-toast-visible",
      dataset: { type: "loading", message: "Analyzing..." },
      querySelector: (selector: string) => selector === ".inspoclip-toast-icon" ? icon : text
    }

    syncToastElement(toast, "Analyzing next step", "loading", 42, true)

    expect(toast.className).toContain("inspoclip-toast-visible")
  })

  test("extracts and clamps percentage progress from loading messages", () => {
    expect(getToastProgress("Understanding video... 42%")).toBe(42)
    expect(getToastProgress("正在理解视频... 125%")).toBe(100)
    expect(getToastProgress("Analyzing...")).toBeNull()
  })

  test("renders concentric circular progress markup for loading toasts", () => {
    const indeterminate = getToastIconMarkup("loading", "Analyzing...")
    const determinate = getToastIconMarkup("loading", "Understanding video...", 42)

    expect(indeterminate).toContain("inspoclip-progress-ring-indeterminate")
    expect(determinate).toContain("inspoclip-progress-ring-determinate")
    expect(determinate.match(/cx="10" cy="10" r="8"/g)).toHaveLength(2)
    expect(determinate).toContain("stroke-dashoffset: 58")
    expect(getToastProgressStrokeOffset(42)).toBe(58)
    expect(indeterminate).not.toContain("inspoclip-spinner")
  })

  test("updates determinate progress without rebuilding the existing ring", () => {
    const progressValue = { style: { strokeDashoffset: "96" } }
    const icon = {
      innerHTML: "existing-ring",
      querySelector: () => progressValue
    }
    const text = { innerHTML: "existing-text" }
    const toast = {
      className: "inspoclip-toast inspoclip-toast-loading",
      dataset: { type: "loading", message: "Analyzing..." },
      querySelector: (selector: string) => selector === ".inspoclip-toast-icon" ? icon : text
    }

    syncToastElement(toast, "Analyzing...", "loading", 42)

    expect(icon.innerHTML).toBe("existing-ring")
    expect(progressValue.style.strokeDashoffset).toBe("58")
    expect(text.innerHTML).toBe("existing-text")
  })

  test("renders loading text as individually animated safe characters", () => {
    const markup = getToastTextMarkup("正在分析...", "loading")

    expect(markup).toContain("inspoclip-toast-text-char")
    expect(markup).toContain("--inspoclip-toast-char-index: 0")
    expect(markup).not.toContain("%")
    expect(getToastTextMarkup("<分析>", "loading")).toContain("&lt;")
    expect(getToastTextMarkup("Saved", "success")).toBe("Saved")
  })
})
