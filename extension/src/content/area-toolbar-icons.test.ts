import { beforeEach, describe, expect, test, vi } from "vitest"

const { createLucideElement } = vi.hoisted(() => ({
  createLucideElement: vi.fn(() => ({
    setAttribute: vi.fn()
  }))
}))

vi.mock("lucide", () => ({
  createElement: createLucideElement,
  Scan: ["scan"],
  Video: ["video"],
  Volume2: ["volume-2"],
  VolumeX: ["volume-x"],
  X: ["x"],
  Pause: ["pause"],
  Play: ["play"],
  RotateCcw: ["rotate-ccw"],
  Check: ["check"]
}))

import {
  AREA_TOOLBAR_ICON_NAMES,
  getAreaToolbarIconMarkup,
  renderAreaToolbarIcons
} from "./area-toolbar-icons"

describe("area toolbar Lucide icons", () => {
  beforeEach(() => {
    createLucideElement.mockClear()
  })

  test("maps every toolbar action to the icon used by the approved mockup", () => {
    expect(AREA_TOOLBAR_ICON_NAMES).toEqual({
      screenshot: "scan",
      record: "video",
      "sound-on": "volume-2",
      "sound-off": "volume-x",
      cancel: "x",
      pause: "pause",
      resume: "play",
      retake: "rotate-ccw",
      "confirm-retake": "rotate-ccw",
      finish: "check"
    })
  })

  test("renders a Lucide placeholder instead of maintaining SVG paths", () => {
    expect(getAreaToolbarIconMarkup("screenshot")).toBe('<i data-lucide="scan" aria-hidden="true"></i>')
    expect(getAreaToolbarIconMarkup("confirm-retake")).toBe('<i data-lucide="rotate-ccw" aria-hidden="true"></i>')
  })

  test("replaces icons only inside the supplied toolbar root", () => {
    const replaceWith = vi.fn()
    const placeholder = {
      getAttribute: vi.fn().mockReturnValue("scan"),
      replaceWith
    }
    const root = {
      querySelectorAll: vi.fn().mockReturnValue([placeholder])
    } as unknown as Element

    renderAreaToolbarIcons(root)

    expect(root.querySelectorAll).toHaveBeenCalledWith("[data-lucide]")
    expect(createLucideElement).toHaveBeenCalledWith(["scan"])
    const svg = createLucideElement.mock.results[0].value
    expect(svg.setAttribute).toHaveBeenCalledWith("width", "16")
    expect(svg.setAttribute).toHaveBeenCalledWith("height", "16")
    expect(svg.setAttribute).toHaveBeenCalledWith("stroke", "currentColor")
    expect(svg.setAttribute).toHaveBeenCalledWith("stroke-width", "1.75")
    expect(svg.setAttribute).toHaveBeenCalledWith("aria-hidden", "true")
    expect(svg.setAttribute).toHaveBeenCalledWith("focusable", "false")
    expect(replaceWith).toHaveBeenCalledWith(svg)
  })
})
