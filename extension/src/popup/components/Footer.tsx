import React from "react"

import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type FooterProps = {
  t: I18nMessages
  version: string
  onOpenApp: (event: React.MouseEvent<HTMLAnchorElement>) => void
  showWorkspaceLink?: boolean
}

export function Footer({ t, version, onOpenApp, showWorkspaceLink = true }: FooterProps) {
  return (
    <div className="footer">
      {showWorkspaceLink ? <a href="#" onClick={onOpenApp}><PopupIcon name="external-link" />{t.openInspoClip}</a> : <span />}
      <span className="footer-version" aria-label={`Version ${version}`}>v{version}</span>
    </div>
  )
}
