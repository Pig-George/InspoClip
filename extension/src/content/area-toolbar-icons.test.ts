import { beforeEach, describe, expect, test, vi } from "vitest"

const { createLucideElement } = vi.hoisted(() => ({
  createLucideElement: vi.fn(() => ({
    setAttribute: vi.fn()
  }))
}))

vi.mock("lucide/dist/esm/createElement.js", () => ({ default: createLucideElement }))
vi.mock("lucide/dist/esm/icons/scan.js", () => ({ default: ["scan"] }))
vi.mock("lucide/dist/esm/icons/video.js", () => ({ default: ["video"] }))
vi.mock("lucide/dist/esm/icons/volume-2.js", () => ({ default: ["volume-2"] }))
vi.mock("lucide/dist/esm/icons/volume-x.js", () => ({ default: ["volume-x"] }))
vi.mock("lucide/dist/esm/icons/x.js", () => ({ default: ["x"] }))
vi.mock("lucide/dist/esm/icons/pause.js", () => ({ default: ["pause"] }))
vi.mock("lucide/dist/esm/icons/play.js", () => ({ default: ["play"] }))
vi.mock("lucide/dist/esm/icons/rotate-ccw.js", () => ({ default: ["rotate-ccw"] }))
vi.mock("lucide/dist/esm/icons/check.js", () => ({ default: ["check"] }))
vi.mock("lucide/dist/esm/icons/timer.js", () => ({ default: ["timer"] }))

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
      delay: "timer",
      finish: "check"
    })
  })

  test("renders a Lucide placeholder instead of maintaining SVG paths", () => {
    expect(getAreaToolbarIconMarkup("screenshot")).toBe('<i data-lucide="scan" aria-hidden="true"></i>')
    expect(getAreaToolbarIconMarkup("confirm-retake")).toBe('<i data-lucide="rotate-ccw" aria-hidden="true"></i>')
    expect(getAreaToolbarIconMarkup("delay")).toBe('<i data-lucide="timer" aria-hidden="true"></i>')
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
