import { createElement } from "react"

import ArrowLeft from "lucide/dist/esm/icons/arrow-left.js"
import TriangleAlert from "lucide/dist/esm/icons/triangle-alert.js"
import Bug from "lucide/dist/esm/icons/bug.js"
import Check from "lucide/dist/esm/icons/check.js"
import ChevronDown from "lucide/dist/esm/icons/chevron-down.js"
import ChevronLeft from "lucide/dist/esm/icons/chevron-left.js"
import ChevronRight from "lucide/dist/esm/icons/chevron-right.js"
import ChevronUp from "lucide/dist/esm/icons/chevron-up.js"
import CircleCheck from "lucide/dist/esm/icons/circle-check.js"
import Clock from "lucide/dist/esm/icons/clock.js"
import Columns3 from "lucide/dist/esm/icons/columns-3.js"
import Command from "lucide/dist/esm/icons/command.js"
import Copy from "lucide/dist/esm/icons/copy.js"
import Download from "lucide/dist/esm/icons/download.js"
import ExternalLink from "lucide/dist/esm/icons/external-link.js"
import Images from "lucide/dist/esm/icons/images.js"
import LayoutGrid from "lucide/dist/esm/icons/layout-grid.js"
import Link2 from "lucide/dist/esm/icons/link-2.js"
import Moon from "lucide/dist/esm/icons/moon.js"
import PanelsTopLeft from "lucide/dist/esm/icons/panels-top-left.js"
import Play from "lucide/dist/esm/icons/play.js"
import RadioTower from "lucide/dist/esm/icons/radio-tower.js"
import RefreshCw from "lucide/dist/esm/icons/refresh-cw.js"
import Scan from "lucide/dist/esm/icons/scan.js"
import Search from "lucide/dist/esm/icons/search.js"
import Server from "lucide/dist/esm/icons/server.js"
import Settings2 from "lucide/dist/esm/icons/settings-2.js"
import Sparkles from "lucide/dist/esm/icons/sparkles.js"
import Sun from "lucide/dist/esm/icons/sun.js"
import Trash2 from "lucide/dist/esm/icons/trash-2.js"
import Upload from "lucide/dist/esm/icons/upload.js"
import WandSparkles from "lucide/dist/esm/icons/wand-sparkles.js"
import X from "lucide/dist/esm/icons/x.js"

export type PopupIconName =
  | "arrow-left"
  | "bug"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "circle-check"
  | "clock"
  | "columns-3"
  | "command"
  | "copy"
  | "download"
  | "external-link"
  | "images"
  | "layout-grid"
  | "link-2"
  | "moon"
  | "panels-top-left"
  | "play"
  | "radio-tower"
  | "refresh-cw"
  | "scan"
  | "search"
  | "server"
  | "settings-2"
  | "sparkles"
  | "sun"
  | "trash-2"
  | "upload"
  | "alert-triangle"
  | "wand-sparkles"
  | "x"

type LucideAttributes = Record<string, string | number>
type LucideIconNode = readonly [string, LucideAttributes, readonly (readonly [string, LucideAttributes])[]]

const POPUP_ICONS: Record<PopupIconName, LucideIconNode> = {
  "arrow-left": ArrowLeft as LucideIconNode,
  bug: Bug as LucideIconNode,
  check: Check as LucideIconNode,
  "chevron-down": ChevronDown as LucideIconNode,
  "chevron-left": ChevronLeft as LucideIconNode,
  "chevron-right": ChevronRight as LucideIconNode,
  "chevron-up": ChevronUp as LucideIconNode,
  "circle-check": CircleCheck as LucideIconNode,
  clock: Clock as LucideIconNode,
  "columns-3": Columns3 as LucideIconNode,
  command: Command as LucideIconNode,
  copy: Copy as LucideIconNode,
  download: Download as LucideIconNode,
  "external-link": ExternalLink as LucideIconNode,
  images: Images as LucideIconNode,
  "layout-grid": LayoutGrid as LucideIconNode,
  "link-2": Link2 as LucideIconNode,
  moon: Moon as LucideIconNode,
  "panels-top-left": PanelsTopLeft as LucideIconNode,
  play: Play as LucideIconNode,
  "radio-tower": RadioTower as LucideIconNode,
  "refresh-cw": RefreshCw as LucideIconNode,
  scan: Scan as LucideIconNode,
  search: Search as LucideIconNode,
  server: Server as LucideIconNode,
  "settings-2": Settings2 as LucideIconNode,
  sparkles: Sparkles as LucideIconNode,
  sun: Sun as LucideIconNode,
  "trash-2": Trash2 as LucideIconNode,
  upload: Upload as LucideIconNode,
  "alert-triangle": TriangleAlert as LucideIconNode,
  "wand-sparkles": WandSparkles as LucideIconNode,
  x: X as LucideIconNode
}

function toReactAttributes(attributes: LucideAttributes): Record<string, string | number> {
  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => {
    if (key === "stroke-width") return ["strokeWidth", value]
    if (key === "stroke-linecap") return ["strokeLinecap", value]
    if (key === "stroke-linejoin") return ["strokeLinejoin", value]
    return [key, value]
  }))
}

type PopupIconProps = {
  name: PopupIconName
  className?: string
}

export function PopupIcon({ name, className }: PopupIconProps) {
  const [, rootAttributes, children] = POPUP_ICONS[name]
  return createElement(
    "svg",
    {
      ...toReactAttributes(rootAttributes),
      className,
      "aria-hidden": "true",
      focusable: "false",
      "data-popup-icon": name
    },
    children.map(([tag, attributes], index) => createElement(tag, {
      ...toReactAttributes(attributes),
      key: `${name}-${index}`
    }))
  )
}
