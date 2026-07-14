import createLucideElement from "lucide/dist/esm/createElement.js"
import Check from "lucide/dist/esm/icons/check.js"
import Pause from "lucide/dist/esm/icons/pause.js"
import Play from "lucide/dist/esm/icons/play.js"
import RotateCcw from "lucide/dist/esm/icons/rotate-ccw.js"
import Scan from "lucide/dist/esm/icons/scan.js"
import Video from "lucide/dist/esm/icons/video.js"
import Volume2 from "lucide/dist/esm/icons/volume-2.js"
import VolumeX from "lucide/dist/esm/icons/volume-x.js"
import X from "lucide/dist/esm/icons/x.js"

type IconNode = readonly unknown[]

export type AreaToolbarAction =
  | "screenshot"
  | "record"
  | "sound-on"
  | "sound-off"
  | "cancel"
  | "pause"
  | "resume"
  | "retake"
  | "confirm-retake"
  | "finish"

export const AREA_TOOLBAR_ICON_NAMES: Record<AreaToolbarAction, string> = {
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
}

const AREA_TOOLBAR_ICONS: Record<string, IconNode> = {
  scan: Scan,
  video: Video,
  "volume-2": Volume2,
  "volume-x": VolumeX,
  x: X,
  pause: Pause,
  play: Play,
  "rotate-ccw": RotateCcw,
  check: Check
}

export function getAreaToolbarIconMarkup(action: AreaToolbarAction): string {
  return `<i data-lucide="${AREA_TOOLBAR_ICON_NAMES[action]}" aria-hidden="true"></i>`
}

export function renderAreaToolbarIcons(root: Element): void {
  root.querySelectorAll<HTMLElement>("[data-lucide]").forEach((placeholder) => {
    const iconName = placeholder.getAttribute("data-lucide") || ""
    const iconNode = AREA_TOOLBAR_ICONS[iconName]
    if (!iconNode) return

    const svg = createLucideElement(iconNode)
    svg.setAttribute("width", "16")
    svg.setAttribute("height", "16")
    svg.setAttribute("stroke", "currentColor")
    svg.setAttribute("stroke-width", "1.75")
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute("focusable", "false")
    placeholder.replaceWith(svg)
  })
}
