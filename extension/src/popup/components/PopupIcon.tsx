import { createElement } from "react"

import ArrowLeft from "lucide/dist/esm/icons/arrow-left.js"
import Check from "lucide/dist/esm/icons/check.js"
import ChevronDown from "lucide/dist/esm/icons/chevron-down.js"
import CircleCheck from "lucide/dist/esm/icons/circle-check.js"
import Command from "lucide/dist/esm/icons/command.js"
import ExternalLink from "lucide/dist/esm/icons/external-link.js"
import Images from "lucide/dist/esm/icons/images.js"
import Link2 from "lucide/dist/esm/icons/link-2.js"
import PanelsTopLeft from "lucide/dist/esm/icons/panels-top-left.js"
import RadioTower from "lucide/dist/esm/icons/radio-tower.js"
import Scan from "lucide/dist/esm/icons/scan.js"
import Server from "lucide/dist/esm/icons/server.js"
import Settings2 from "lucide/dist/esm/icons/settings-2.js"
import Sparkles from "lucide/dist/esm/icons/sparkles.js"
import WandSparkles from "lucide/dist/esm/icons/wand-sparkles.js"

export type PopupIconName =
  | "arrow-left"
  | "check"
  | "chevron-down"
  | "circle-check"
  | "command"
  | "external-link"
  | "images"
  | "link-2"
  | "panels-top-left"
  | "radio-tower"
  | "scan"
  | "server"
  | "settings-2"
  | "sparkles"
  | "wand-sparkles"

type LucideAttributes = Record<string, string | number>
type LucideIconNode = readonly [string, LucideAttributes, readonly (readonly [string, LucideAttributes])[]]

const POPUP_ICONS: Record<PopupIconName, LucideIconNode> = {
  "arrow-left": ArrowLeft as LucideIconNode,
  check: Check as LucideIconNode,
  "chevron-down": ChevronDown as LucideIconNode,
  "circle-check": CircleCheck as LucideIconNode,
  command: Command as LucideIconNode,
  "external-link": ExternalLink as LucideIconNode,
  images: Images as LucideIconNode,
  "link-2": Link2 as LucideIconNode,
  "panels-top-left": PanelsTopLeft as LucideIconNode,
  "radio-tower": RadioTower as LucideIconNode,
  scan: Scan as LucideIconNode,
  server: Server as LucideIconNode,
  "settings-2": Settings2 as LucideIconNode,
  sparkles: Sparkles as LucideIconNode,
  "wand-sparkles": WandSparkles as LucideIconNode
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
