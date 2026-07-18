import React from "react"

import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type FooterProps = {
  t: I18nMessages
  version: string
  onOpenApp: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export function Footer({ t, version, onOpenApp }: FooterProps) {
  return (
    <div className="footer">
      <a href="#" onClick={onOpenApp}><PopupIcon name="external-link" />{t.openInspoClip}</a>
      <span className="footer-version" aria-label={`Version ${version}`}>v{version}</span>
    </div>
  )
}
